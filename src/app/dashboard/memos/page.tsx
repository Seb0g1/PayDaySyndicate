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
  const { data: session } = useSession();
  const role = ((session as any)?.user as any)?.role as string | undefined;
  const NI = useNextIcons();
  const { showSuccess } = useSuccess();

  const isDirector = role === "DIRECTOR";
  const { data: memos, mutate } = useSWR<Memo[]>("/api/memos", fetcher);

  const [showModal, setShowModal] = useState(false);
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [isPublished, setIsPublished] = useState(true);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setImages([]);
    setExistingImages([]);
    setIsPublished(true);
    setSelectedMemo(null);
  };

  const handleCreate = async () => {
    if (!title || !content) {
      alert("Заполните название и содержание памятки");
      return;
    }

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

      if (!res.ok) throw new Error("Ошибка при создании памятки");

      showSuccess("Памятка создана!");
      mutate();
      setShowModal(false);
      resetForm();
    } catch (error) {
      alert("Ошибка при создании памятки");
    }
  };

  const handleUpdate = async () => {
    if (!selectedMemo || !title || !content) {
      alert("Заполните название и содержание памятки");
      return;
    }

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

      if (!res.ok) throw new Error("Ошибка при обновлении памятки");

      showSuccess("Памятка обновлена!");
      mutate();
      setShowModal(false);
      resetForm();
    } catch (error) {
      alert("Ошибка при обновлении памятки");
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
    setIsPublished(memo.isPublished);
    setShowModal(true);
  };

  const removeImage = (index: number) => {
    setExistingImages(existingImages.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Памятки</h1>
        {isDirector && (
          <button className="btn-primary flex items-center gap-1" onClick={() => setShowModal(true)}>
            <NI.Plus className="w-4 h-4" /> Создать памятку
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(memos ?? []).map((memo) => (
          <div key={memo.id} className="card p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold text-white">{memo.title}</h3>
              {isDirector && (
                <div className="flex gap-2">
                  <button
                    className="btn-ghost text-xs"
                    onClick={() => handleEdit(memo)}
                    title="Редактировать"
                  >
                    <NI.Edit className="w-4 h-4" />
                  </button>
                  <button
                    className="btn-ghost text-xs text-red-500"
                    onClick={() => handleDelete(memo.id)}
                    title="Удалить"
                  >
                    <NI.Trash className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            <div
              className="text-sm text-gray-300 mb-3 prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: memo.content }}
            />
            {memo.images.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                {memo.images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`Изображение ${idx + 1}`}
                    className="w-full h-24 object-cover rounded border border-red-500/30"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZTwvdGV4dD48L3N2Zz4=`;
                    }}
                  />
                ))}
              </div>
            )}
            <div className="text-xs text-gray-500 mt-3">
              {new Date(memo.createdAt).toLocaleDateString("ru-RU")}
            </div>
          </div>
        ))}
      </div>

      {showModal && isDirector && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0, 0, 0, 0.8)" }}
          onClick={() => {
            setShowModal(false);
            resetForm();
          }}
        >
          <div className="modal-panel max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">
                {selectedMemo ? "Редактировать памятку" : "Создать памятку"}
              </h2>
              <button
                className="text-white text-2xl hover:text-red-500 transition-colors"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2 text-white">Название *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border rounded px-3 py-2 bg-gray-900 text-white border-gray-700"
                  placeholder="Введите название памятки"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-white">Содержание (HTML) *</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  className="w-full border rounded px-3 py-2 bg-gray-900 text-white border-gray-700 font-mono text-sm"
                  placeholder="HTML контент, например: &lt;p&gt;Текст&lt;/p&gt;"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-white">Изображения</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => setImages(Array.from(e.target.files || []))}
                  className="w-full border rounded px-3 py-2 bg-gray-900 text-white border-gray-700"
                />
                {images.length > 0 && (
                  <div className="mt-2 text-sm text-gray-400">
                    Выбрано новых файлов: {images.length}
                  </div>
                )}
              </div>

              {existingImages.length > 0 && (
                <div>
                  <label className="block text-sm mb-2 text-white">Существующие изображения</label>
                  <div className="grid grid-cols-3 gap-2">
                    {existingImages.map((img, idx) => (
                      <div key={idx} className="relative">
                        <img
                          src={img}
                          alt={`Изображение ${idx + 1}`}
                          className="w-full h-24 object-cover rounded border border-red-500/30"
                        />
                        <button
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                          onClick={() => removeImage(idx)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="flex items-center gap-2 text-white">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="rounded"
                  />
                  <span>Опубликовать</span>
                </label>
              </div>

              <button
                className="w-full btn-primary"
                onClick={selectedMemo ? handleUpdate : handleCreate}
              >
                {selectedMemo ? "Сохранить изменения" : "Создать памятку"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


