"use client";
import { useState, useEffect } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { useNextIcons } from "@/components/NI";
import { useSuccess } from "@/components/SuccessProvider";
import Image from "next/image";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Memo = {
  id: string;
  title: string;
  content: string;
  images: string[];
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

  // Показываем загрузку пока сессия загружается
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white">Загрузка...</div>
      </div>
    );
  }

  const isDirector = role === "DIRECTOR";
  const { data: memos, mutate, isLoading } = useSWR<Memo[]>("/api/memos", fetcher);

  const [showModal, setShowModal] = useState(false);
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [isPublished, setIsPublished] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setImages([]);
    setExistingImages([]);
    setPreviewImages([]);
    setIsPublished(true);
    setSelectedMemo(null);
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
    setShowModal(true);
  };

  const removeImage = (index: number) => {
    setExistingImages(existingImages.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    setPreviewImages(previewImages.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
          Памятки
        </h1>
        {isDirector && (
          <button 
            className="btn-primary flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold shadow-lg shadow-red-500/20 transition-all transform hover:scale-105"
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
          >
            {NI ? <NI.Plus className="w-5 h-5" /> : "+"} Создать памятку
          </button>
        )}
      </div>

      {/* Список памяток */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
          <p className="ml-3 text-gray-400">Загрузка памяток...</p>
        </div>
      ) : !memos || memos.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-gray-400 text-lg mb-2">
            {NI && <NI.FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />}
            {isDirector ? "Памяток пока нет. Создайте первую памятку!" : "Памяток пока нет."}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {memos.map((memo) => (
            <div 
              key={memo.id} 
              className="card p-6 bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-gray-700/50 hover:border-red-500/50 transition-all hover:shadow-lg hover:shadow-red-500/10"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-semibold text-white flex-1 pr-2">{memo.title}</h3>
                {isDirector && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      className="p-2 rounded-lg border border-gray-700 text-gray-300 hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-400 transition-all"
                      onClick={() => handleEdit(memo)}
                      title="Редактировать"
                    >
                      {NI ? <NI.Edit className="w-4 h-4" /> : "✏️"}
                    </button>
                    <button
                      className="p-2 rounded-lg border border-gray-700 text-gray-300 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 transition-all"
                      onClick={() => handleDelete(memo.id)}
                      title="Удалить"
                    >
                      {NI ? <NI.Trash className="w-4 h-4" /> : "🗑️"}
                    </button>
                  </div>
                )}
              </div>
              
              <div
                className="text-sm text-gray-300 mb-4 prose prose-invert max-w-none prose-headings:text-white prose-p:text-gray-300 prose-strong:text-white prose-ul:text-gray-300 prose-ol:text-gray-300 prose-li:text-gray-300"
                dangerouslySetInnerHTML={{ __html: memo.content }}
              />
              
              {memo.images.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-4 mb-4">
                  {memo.images.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={img}
                        alt={`Изображение ${idx + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-red-500/30 hover:border-red-500/60 transition-all cursor-pointer"
                        onClick={() => window.open(img, '_blank')}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZTwvdGV4dD48L3N2Zz4=`;
                        }}
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <span className="text-white text-xs">Нажмите для просмотра</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  {NI && <NI.Calendar className="w-3 h-3" />}
                  {new Date(memo.createdAt).toLocaleDateString("ru-RU", { 
                    day: "2-digit", 
                    month: "2-digit", 
                    year: "numeric" 
                  })}
                </div>
                {!memo.isPublished && (
                  <span className="px-2 py-1 text-xs rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                    Черновик
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно создания/редактирования */}
      {showModal && isDirector && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0, 0, 0, 0.8)" }}
          onClick={() => {
            setShowModal(false);
            resetForm();
          }}
        >
          <div 
            className="modal-panel max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
                {NI && <NI.FileText className="w-6 h-6 text-red-500" />}
                {selectedMemo ? "Редактировать памятку" : "Создать памятку"}
              </h2>
              <button
                className="text-white text-2xl hover:text-red-500 transition-colors p-1"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white flex items-center gap-2">
                  {NI && <NI.Edit className="w-4 h-4" />}
                  Название *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-gray-700 rounded-lg px-4 py-2.5 bg-gray-900/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                  placeholder="Введите название памятки"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-white flex items-center gap-2">
                  {NI && <NI.FileText className="w-4 h-4" />}
                  Содержание (HTML) *
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={12}
                  className="w-full border border-gray-700 rounded-lg px-4 py-2.5 bg-gray-900/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all font-mono text-sm resize-none"
                  placeholder="HTML контент, например: &lt;p&gt;Текст&lt;/p&gt; или &lt;ul&gt;&lt;li&gt;Пункт 1&lt;/li&gt;&lt;li&gt;Пункт 2&lt;/li&gt;&lt;/ul&gt;"
                />
                <div className="text-xs text-gray-400 mt-1">
                  Поддерживается HTML разметка. Можно использовать теги: &lt;p&gt;, &lt;ul&gt;, &lt;ol&gt;, &lt;li&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;br&gt; и др.
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-white flex items-center gap-2">
                  {NI && <NI.Upload className="w-4 h-4" />}
                  Изображения
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => setImages(Array.from(e.target.files || []))}
                  className="w-full border border-gray-700 rounded-lg px-4 py-2.5 bg-gray-900/50 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-500 file:text-white hover:file:bg-red-600 file:cursor-pointer"
                />
                {images.length > 0 && (
                  <div className="mt-2 text-sm text-gray-400">
                    Выбрано новых файлов: {images.length}
                  </div>
                )}
              </div>

              {/* Превью новых изображений */}
              {previewImages.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white">Превью новых изображений</label>
                  <div className="grid grid-cols-3 gap-3">
                    {previewImages.map((preview, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={preview}
                          alt={`Превью ${idx + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-gray-700"
                        />
                        <button
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          onClick={() => removeNewImage(idx)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Существующие изображения */}
              {existingImages.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white">Существующие изображения</label>
                  <div className="grid grid-cols-3 gap-3">
                    {existingImages.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={img}
                          alt={`Изображение ${idx + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-red-500/30"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZTwvdGV4dD48L3N2Zz4=`;
                          }}
                        />
                        <button
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          onClick={() => removeImage(idx)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-700 bg-gray-900 text-red-500 focus:ring-red-500 focus:ring-2"
                />
                <label className="text-white font-medium cursor-pointer">
                  Опубликовать памятку (видна всем сотрудникам)
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-700/50">
                <button
                  className="flex-1 btn-primary flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold shadow-lg shadow-red-500/20 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  onClick={selectedMemo ? handleUpdate : handleCreate}
                  disabled={saving || !title || !content}
                >
                  {saving ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Сохранение...
                    </>
                  ) : (
                    <>
                      {NI ? <NI.Save className="w-4 h-4" /> : "💾"} {selectedMemo ? "Сохранить изменения" : "Создать памятку"}
                    </>
                  )}
                </button>
                <button
                  className="px-6 py-3 rounded-lg border border-gray-700 text-gray-300 hover:border-red-500/50 hover:bg-red-500/10 transition-all"
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
        </div>
      )}
    </div>
  );
}
