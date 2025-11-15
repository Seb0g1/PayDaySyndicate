"use client";
import { useState, useEffect } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { useNextIcons } from "@/components/NI";
import { useSuccess } from "@/components/SuccessProvider";
import { createPortal } from "react-dom";
import Image from "next/image";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to fetch" }));
    throw new Error(error.error || `HTTP error! status: ${res.status}`);
  }
  return res.json();
};

type MemoStep = {
  description: string;
  image: string | null;
};

type Memo = {
  id: string;
  title: string;
  content: string;
  images: string[];
  steps: MemoStep[] | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name?: string | null };
};

export default function MemosPage() {
  const { data: session, status } = useSession();
  const role = ((session as any)?.user as any)?.role as string | undefined;
  const NI = useNextIcons();
  const { showSuccess } = useSuccess();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Показываем загрузку пока сессия загружается
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white">Загрузка...</div>
      </div>
    );
  }

  const isDirector = role === "DIRECTOR";
  const { data: memos, mutate, isLoading, error: swrError } = useSWR<Memo[]>("/api/memos", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  const [showModal, setShowModal] = useState(false);
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [isPublished, setIsPublished] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [steps, setSteps] = useState<Array<{ description: string; image: string | null; imageFile?: File | null; preview?: string }>>([]);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setImages([]);
    setExistingImages([]);
    setPreviewImages([]);
    setIsPublished(true);
    setSelectedMemo(null);
    setSteps([]);
  };

  // Создаем превью для новых изображений
  useEffect(() => {
    if (images.length > 0) {
      const previews: string[] = [];
      images.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          previews.push(reader.result as string);
          if (previews.length === images.length) {
            setPreviewImages(previews);
          }
        };
        reader.readAsDataURL(file);
      });
    } else {
      setPreviewImages([]);
    }
  }, [images]);

  const handleCreate = async () => {
    if (!title || !content) {
      alert("Заполните название и содержание памятки");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("content", content);
      formData.append("isPublished", String(isPublished));
      images.forEach((img) => formData.append("images", img));

      // Добавляем шаги
      if (steps.length > 0) {
        const stepsData = steps.map((step) => ({
          description: step.description,
          image: step.image || null,
        }));
        formData.append("steps", JSON.stringify(stepsData));
        
        // Добавляем файлы изображений для шагов
        steps.forEach((step, index) => {
          if (step.imageFile) {
            formData.append(`step_${index}_image`, step.imageFile);
          }
        });
      }

      const res = await fetch("/api/memos", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Ошибка при создании памятки");
      }

      showSuccess("Памятка создана!");
      mutate();
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      alert(error.message || "Ошибка при создании памятки");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedMemo || !title || !content) {
      alert("Заполните название и содержание памятки");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("content", content);
      formData.append("isPublished", String(isPublished));
      formData.append("existingImages", JSON.stringify(existingImages));
      images.forEach((img) => formData.append("images", img));

      // Добавляем шаги
      if (steps.length > 0) {
        const stepsData = steps.map((step) => ({
          description: step.description,
          image: step.image || null,
        }));
        formData.append("steps", JSON.stringify(stepsData));
        
        // Добавляем файлы изображений для шагов
        steps.forEach((step, index) => {
          if (step.imageFile) {
            formData.append(`step_${index}_image`, step.imageFile);
          }
        });
      }

      const res = await fetch(`/api/memos/${selectedMemo.id}`, {
        method: "PATCH",
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Ошибка при обновлении памятки");
      }

      showSuccess("Памятка обновлена!");
      mutate();
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      alert(error.message || "Ошибка при обновлении памятки");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить эту памятку?")) return;

    try {
      const res = await fetch(`/api/memos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Ошибка при удалении памятки");

      showSuccess("Памятка удалена!");
      mutate();
    } catch (error) {
      alert("Ошибка при удалении памятки");
    }
  };

  const handleEdit = (memo: Memo) => {
    setSelectedMemo(memo);
    setTitle(memo.title);
    setContent(memo.content);
    setExistingImages(memo.images);
    setImages([]);
    setPreviewImages([]);
    setIsPublished(memo.isPublished);
    // Загружаем шаги из памятки
    if (memo.steps && Array.isArray(memo.steps)) {
      setSteps(memo.steps.map((step) => ({
        description: step.description || "",
        image: step.image,
        imageFile: null,
        preview: step.image || undefined,
      })));
    } else {
      setSteps([]);
    }
    setShowModal(true);
  };

  const removeImage = (index: number) => {
    setExistingImages(existingImages.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    setPreviewImages(previewImages.filter((_, i) => i !== index));
  };

  const addStep = () => {
    setSteps([...steps, { description: "", image: null, imageFile: null }]);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: "description" | "imageFile", value: string | File | null) => {
    const updatedSteps = [...steps];
    if (field === "description") {
      updatedSteps[index] = { ...updatedSteps[index], description: value as string };
    } else if (field === "imageFile") {
      const file = value as File | null;
      updatedSteps[index] = { ...updatedSteps[index], imageFile: file || null };
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          updatedSteps[index] = { ...updatedSteps[index], preview: reader.result as string };
          setSteps([...updatedSteps]);
        };
        reader.readAsDataURL(file);
      } else {
        updatedSteps[index] = { ...updatedSteps[index], preview: undefined };
      }
    }
    setSteps(updatedSteps);
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Заголовок с градиентом и анимацией */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-500 via-red-400 to-red-600 bg-clip-text text-transparent mb-2">
            Памятки
          </h1>
          <p className="text-gray-400 text-sm">Управление инструкциями и памятками для сотрудников</p>
        </div>
        {isDirector && (
          <button 
            className="group relative flex items-center gap-3 px-6 py-3.5 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold shadow-lg shadow-red-500/30 transition-all transform hover:scale-105 hover:shadow-xl hover:shadow-red-500/40 overflow-hidden"
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
            {NI && <NI.Plus className="w-5 h-5 relative z-10" />}
            <span className="relative z-10">Создать памятку</span>
          </button>
        )}
      </div>

      {/* Список памяток */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="relative">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-red-500/20 border-t-red-500"></div>
            <p className="ml-4 text-gray-400 text-lg">Загрузка памяток...</p>
          </div>
        </div>
      ) : swrError ? (
        <div className="card p-12 text-center bg-gradient-to-br from-red-900/20 to-red-800/10 border border-red-500/30 rounded-2xl">
          <div className="text-red-400 text-lg mb-2">
            {NI && <NI.AlertTriangle className="w-12 h-12 mx-auto mb-4" />}
            <p className="text-xl mb-2">Ошибка загрузки памяток</p>
            <p className="text-sm text-red-500/70">{swrError.message || "Не удалось загрузить памятки"}</p>
          </div>
        </div>
      ) : !memos || memos.length === 0 ? (
        <div className="card p-16 text-center bg-gradient-to-br from-gray-900/50 to-gray-800/30 border border-gray-700/50 rounded-2xl">
          <div className="text-gray-400 text-lg mb-4">
            {NI && <NI.FileText className="w-16 h-16 mx-auto mb-6 opacity-30" />}
            <p className="text-xl mb-2">{isDirector ? "Памяток пока нет" : "Памяток пока нет"}</p>
            <p className="text-sm text-gray-500">{isDirector ? "Создайте первую памятку для сотрудников!" : "Ожидайте публикации памяток от руководства"}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {memos.map((memo, idx) => (
            <div 
              key={memo.id} 
              className="group relative card p-0 bg-gradient-to-br from-gray-900/60 via-gray-900/40 to-gray-800/60 border border-gray-700/50 rounded-2xl overflow-hidden hover:border-red-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-red-500/10 hover:-translate-y-1"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              {/* Декоративный градиент сверху */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-red-400 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="p-6">
                {/* Заголовок с действиями */}
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-bold text-white flex-1 pr-3 group-hover:text-red-400 transition-colors line-clamp-2">
                    {memo.title}
                  </h3>
                  {isDirector && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        className="p-2 rounded-lg bg-gray-800/50 hover:bg-blue-500/20 text-gray-400 hover:text-blue-400 border border-gray-700/50 hover:border-blue-500/50 transition-all transform hover:scale-110"
                        onClick={() => handleEdit(memo)}
                        title="Редактировать"
                      >
                        {NI && <NI.Edit className="w-4 h-4" />}
                      </button>
                      <button
                        className="p-2 rounded-lg bg-gray-800/50 hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-gray-700/50 hover:border-red-500/50 transition-all transform hover:scale-110"
                        onClick={() => handleDelete(memo.id)}
                        title="Удалить"
                      >
                        {NI && <NI.Trash className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Содержание */}
                <div
                  className="text-sm text-gray-300 mb-4 prose prose-invert max-w-none prose-headings:text-white prose-p:text-gray-300 prose-strong:text-white prose-ul:text-gray-300 prose-ol:text-gray-300 prose-li:text-gray-300 line-clamp-3"
                  dangerouslySetInnerHTML={{ __html: memo.content }}
                />
                
                {/* Отображение шагов */}
                {memo.steps && Array.isArray(memo.steps) && memo.steps.length > 0 && (
                  <div className="space-y-3 mt-4 mb-4">
                    {memo.steps.slice(0, 2).map((step, idx) => (
                      <div key={idx} className="p-3 bg-gradient-to-r from-gray-900/50 to-gray-800/30 rounded-xl border border-gray-700/30 hover:border-red-500/30 transition-all">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-red-400 bg-red-500/20 px-2.5 py-1 rounded-full border border-red-500/30">
                            Шаг {idx + 1}
                          </span>
                        </div>
                        {step.description && (
                          <p className="text-xs text-gray-300 mb-2 line-clamp-2">{step.description}</p>
                        )}
                        {step.image && (
                          <div className="relative group/img overflow-hidden rounded-lg">
                            <img
                              src={step.image}
                              alt={`Шаг ${idx + 1}`}
                              className="w-full h-32 object-cover border border-red-500/20 hover:border-red-500/50 transition-all cursor-pointer transform group-hover/img:scale-105"
                              onClick={() => window.open(step.image || '', '_blank')}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZTwvdGV4dD48L3N2Zz4=`;
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end justify-center pb-2">
                              <span className="text-white text-xs font-medium">Нажмите для просмотра</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {memo.steps.length > 2 && (
                      <div className="text-xs text-gray-500 text-center py-2">
                        +{memo.steps.length - 2} еще шагов
                      </div>
                    )}
                  </div>
                )}
                
                {/* Старые изображения (для обратной совместимости) */}
                {(!memo.steps || !Array.isArray(memo.steps) || memo.steps.length === 0) && memo.images.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-4 mb-4">
                    {memo.images.slice(0, 2).map((img, idx) => (
                      <div key={idx} className="relative group/img overflow-hidden rounded-lg">
                        <img
                          src={img}
                          alt={`Изображение ${idx + 1}`}
                          className="w-full h-24 object-cover border border-red-500/20 hover:border-red-500/50 transition-all cursor-pointer transform group-hover/img:scale-105"
                          onClick={() => window.open(img, '_blank')}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZTwvdGV4dD48L3N2Zz4=`;
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Футер */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-700/30 mt-4">
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    {NI && <NI.Calendar className="w-3.5 h-3.5" />}
                    {new Date(memo.createdAt).toLocaleDateString("ru-RU", { 
                      day: "2-digit", 
                      month: "2-digit", 
                      year: "numeric" 
                    })}
                  </div>
                  {!memo.isPublished && (
                    <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                      Черновик
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно создания/редактирования */}
      {showModal && isDirector && mounted && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200"
          style={{ background: "rgba(0, 0, 0, 0.85)", backdropFilter: "blur(4px)" }}
          onClick={() => {
            setShowModal(false);
            resetForm();
          }}
        >
          <div 
            className="modal-panel max-w-5xl w-full max-h-[95vh] overflow-y-auto bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-gray-700/50 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Заголовок модального окна */}
            <div className="sticky top-0 z-10 bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-700/50 px-6 py-5 rounded-t-2xl backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/20 rounded-lg border border-red-500/30">
                    {NI && <NI.FileText className="w-6 h-6 text-red-400" />}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {selectedMemo ? "Редактировать памятку" : "Создать новую памятку"}
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {selectedMemo ? "Обновите информацию о памятке" : "Заполните форму для создания памятки"}
                    </p>
                  </div>
                </div>
                <button
                  className="p-2 rounded-lg bg-gray-800/50 hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-gray-700/50 hover:border-red-500/50 transition-all transform hover:scale-110"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  {NI && <NI.X className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Название */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white flex items-center gap-2">
                  {NI && <NI.Edit className="w-4 h-4 text-red-400" />}
                  Название памятки *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-gray-700/50 rounded-xl px-4 py-3 bg-gray-900/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                  placeholder="Введите название памятки..."
                />
              </div>

              {/* Содержание */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white flex items-center gap-2">
                  {NI && <NI.FileText className="w-4 h-4 text-red-400" />}
                  Содержание (HTML) *
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  className="w-full border border-gray-700/50 rounded-xl px-4 py-3 bg-gray-900/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all font-mono text-sm resize-none"
                  placeholder="HTML контент, например: &lt;p&gt;Текст&lt;/p&gt; или &lt;ul&gt;&lt;li&gt;Пункт 1&lt;/li&gt;&lt;li&gt;Пункт 2&lt;/li&gt;&lt;/ul&gt;"
                />
                <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <span>💡</span>
                  <span>Поддерживается HTML разметка: &lt;p&gt;, &lt;ul&gt;, &lt;ol&gt;, &lt;li&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;br&gt; и др.</span>
                </div>
              </div>

              {/* Шаги с фотографиями */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-white flex items-center gap-2">
                    {NI && <NI.List className="w-4 h-4 text-red-400" />}
                    Пошаговые инструкции
                  </label>
                  <button
                    type="button"
                    onClick={addStep}
                    className="group px-4 py-2 text-sm rounded-xl bg-gradient-to-r from-red-500/20 to-red-600/20 hover:from-red-500/30 hover:to-red-600/30 text-red-400 border border-red-500/30 hover:border-red-500/50 transition-all flex items-center gap-2 transform hover:scale-105"
                  >
                    {NI && <NI.Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />}
                    Добавить шаг
                  </button>
                </div>
                
                {steps.length > 0 && (
                  <div className="space-y-4">
                    {steps.map((step, index) => (
                      <div key={index} className="p-5 bg-gradient-to-br from-gray-900/50 to-gray-800/30 rounded-xl border border-gray-700/50 space-y-4 hover:border-red-500/30 transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30 flex items-center justify-center">
                              <span className="text-sm font-bold text-red-400">{index + 1}</span>
                            </div>
                            <span className="text-sm font-semibold text-gray-300">Шаг {index + 1}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeStep(index)}
                            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 transition-all transform hover:scale-110"
                          >
                            {NI && <NI.Trash className="w-4 h-4" />}
                          </button>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-2">Описание шага</label>
                            <textarea
                              value={step.description}
                              onChange={(e) => updateStep(index, "description", e.target.value)}
                              rows={3}
                              className="w-full border border-gray-700/50 rounded-lg px-3 py-2.5 bg-gray-900/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all text-sm resize-none"
                              placeholder="Опишите этот шаг подробно..."
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-2">Фотография для шага</label>
                            <div className="space-y-2">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => updateStep(index, "imageFile", e.target.files?.[0] || null)}
                                className="w-full border border-gray-700/50 rounded-lg px-3 py-2.5 bg-gray-900/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-red-500/20 file:text-red-400 file:border file:border-red-500/30 hover:file:bg-red-500/30 file:cursor-pointer"
                              />
                              {(step.preview || step.image) && (
                                <div className="relative group overflow-hidden rounded-lg border border-red-500/30">
                                  <img
                                    src={step.preview || step.image || ""}
                                    alt={`Шаг ${index + 1}`}
                                    className="w-full h-48 object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZTwvdGV4dD48L3N2Zz4=`;
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
                                    <span className="text-white text-xs font-medium">Превью фотографии</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Публикация */}
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-gray-900/50 to-gray-800/30 rounded-xl border border-gray-700/50">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-700 bg-gray-900 text-red-500 focus:ring-red-500 focus:ring-2 cursor-pointer"
                />
                <label className="text-white font-medium cursor-pointer flex items-center gap-2">
                  {NI && <NI.Eye className="w-4 h-4 text-gray-400" />}
                  <span>Опубликовать памятку (видна всем сотрудникам)</span>
                </label>
              </div>

              {/* Кнопки действий */}
              <div className="flex gap-3 pt-4 border-t border-gray-700/50">
                <button
                  className="flex-1 group relative flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold shadow-lg shadow-red-500/30 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none overflow-hidden"
                  onClick={selectedMemo ? handleUpdate : handleCreate}
                  disabled={saving || !title || !content}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
                  {saving ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white relative z-10"></div>
                      <span className="relative z-10">Сохранение...</span>
                    </>
                  ) : (
                    <>
                      {NI ? <NI.Save className="w-4 h-4 relative z-10" /> : "💾"}
                      <span className="relative z-10">{selectedMemo ? "Сохранить изменения" : "Создать памятку"}</span>
                    </>
                  )}
                </button>
                <button
                  className="px-6 py-3.5 rounded-xl border border-gray-700/50 text-gray-300 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 transition-all font-medium"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
