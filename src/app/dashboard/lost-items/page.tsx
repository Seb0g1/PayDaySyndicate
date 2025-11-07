"use client";
import { useState, useEffect } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { useNextIcons } from "@/components/NI";
import { useSuccess } from "@/components/SuccessProvider";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type LostItem = {
  id: string;
  pcNumber?: string | null;
  guestPhone?: string | null;
  guestName?: string | null;
  photos: string[];
  location?: string | null;
  status: "LOST" | "RETRIEVED";
  createdAt: string;
  retrievedAt?: string | null;
  createdBy: { id: string; name?: string | null };
  retrievedBy?: { id: string; name?: string | null } | null;
};

export default function LostItemsPage() {
  const { data: session } = useSession();
  const role = ((session as any)?.user as any)?.role as string | undefined;
  const NI = useNextIcons();
  const { showSuccess } = useSuccess();

  const isAdmin = role === "ADMIN" || role === "SENIOR_ADMIN" || role === "DIRECTOR";
  const { data: items, mutate } = useSWR<LostItem[]>("/api/lost-items", fetcher);

  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LostItem | null>(null);
  const [pcNumber, setPcNumber] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestName, setGuestName] = useState("");
  const [location, setLocation] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);

  const resetForm = () => {
    setPcNumber("");
    setGuestPhone("");
    setGuestName("");
    setLocation("");
    setPhotos([]);
    setExistingPhotos([]);
    setSelectedItem(null);
  };

  const handleCreate = async () => {
    if (!pcNumber && !guestPhone && !guestName) {
      alert("Заполните хотя бы одно поле: ПК/PS5, номер гостя или имя гостя");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("pcNumber", pcNumber);
      formData.append("guestPhone", guestPhone);
      formData.append("guestName", guestName);
      formData.append("location", location);
      photos.forEach((photo) => formData.append("photos", photo));

      const res = await fetch("/api/lost-items", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Ошибка при создании записи");

      showSuccess("Забытая вещь добавлена!");
      mutate();
      setShowModal(false);
      resetForm();
    } catch (error) {
      alert("Ошибка при создании записи");
    }
  };

  const handleMarkRetrieved = async (itemId: string) => {
    if (!confirm("Отметить вещь как забранную?")) return;

    try {
      const res = await fetch(`/api/lost-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "RETRIEVED" }),
      });

      if (!res.ok) throw new Error("Ошибка при обновлении");

      showSuccess("Вещь отмечена как забранная!");
      mutate();
    } catch (error) {
      alert("Ошибка при обновлении");
    }
  };

  const pcOptions = [...Array(40).keys()].map((i) => `PC${i + 1}`).concat(["PS5"]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Забытые вещи</h1>
        {isAdmin && (
          <button className="btn-primary flex items-center gap-1" onClick={() => setShowModal(true)}>
            <NI.Plus className="w-4 h-4" /> Добавить забытую вещь
          </button>
        )}
      </div>

      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="p-2">ПК/PS5</th>
              <th className="p-2">Номер гостя</th>
              <th className="p-2">Имя гостя</th>
              <th className="p-2">Местонахождение</th>
              <th className="p-2">Фото</th>
              <th className="p-2">Статус</th>
              <th className="p-2">Добавил</th>
              <th className="p-2">Забрал</th>
              <th className="p-2">Действия</th>
            </tr>
          </thead>
          <tbody>
            {(items ?? []).map((item) => (
              <tr key={item.id} className="border-t hover:bg-gray-50/5">
                <td className="p-2">{item.pcNumber || "-"}</td>
                <td className="p-2">{item.guestPhone || "-"}</td>
                <td className="p-2">{item.guestName || "-"}</td>
                <td className="p-2">{item.location || "-"}</td>
                <td className="p-2">
                  {item.photos.length > 0 ? (
                    <span className="text-blue-400">📷 {item.photos.length} фото</span>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="p-2">
                  <span className={`chip ${item.status === "RETRIEVED" ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"}`}>
                    {item.status === "RETRIEVED" ? "Забрано" : "Забыто"}
                  </span>
                </td>
                <td className="p-2">{item.createdBy.name || "-"}</td>
                <td className="p-2">{item.retrievedBy?.name || "-"}</td>
                <td className="p-2">
                  {isAdmin && item.status === "LOST" && (
                    <button
                      className="btn-ghost text-xs"
                      onClick={() => handleMarkRetrieved(item.id)}
                    >
                      Отметить забранным
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && isAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0, 0, 0, 0.8)" }}
          onClick={() => {
            setShowModal(false);
            resetForm();
          }}
        >
          <div className="modal-panel max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Добавить забытую вещь</h2>
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
                <label className="block text-sm mb-2 text-white">ПК/PS5</label>
                <select
                  value={pcNumber}
                  onChange={(e) => setPcNumber(e.target.value)}
                  className="w-full border rounded px-3 py-2 bg-gray-900 text-white border-gray-700"
                >
                  <option value="">Выберите ПК/PS5</option>
                  {pcOptions.map((pc) => (
                    <option key={pc} value={pc}>
                      {pc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-2 text-white">Номер гостя</label>
                <input
                  type="text"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="w-full border rounded px-3 py-2 bg-gray-900 text-white border-gray-700"
                  placeholder="Номер телефона гостя"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-white">Имя гостя</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full border rounded px-3 py-2 bg-gray-900 text-white border-gray-700"
                  placeholder="Имя гостя"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-white">Местонахождение</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full border rounded px-3 py-2 bg-gray-900 text-white border-gray-700"
                  placeholder="Где находилась вещь"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-white">Фотографии</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => setPhotos(Array.from(e.target.files || []))}
                  className="w-full border rounded px-3 py-2 bg-gray-900 text-white border-gray-700"
                />
                {photos.length > 0 && (
                  <div className="mt-2 text-sm text-gray-400">
                    Выбрано файлов: {photos.length}
                  </div>
                )}
              </div>

              <button className="w-full btn-primary" onClick={handleCreate}>
                Добавить забытую вещь
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

