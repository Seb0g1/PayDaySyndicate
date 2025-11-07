"use client";
import { useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { useNextIcons } from "@/components/NI";
import { useSuccess } from "@/components/SuccessProvider";
import { useError } from "@/components/ErrorProvider";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  category?: string | null;
  subcategory?: string | null;
  categoryRef?: { id: string; name: string } | null;
  orderInfo?: {
    id: string;
    officialName: string | null;
    quantityPerBox: number | null;
  } | null;
};

type OrderItem = {
  productId: string;
  productName: string;
  officialName: string;
  quantityPerBox: number;
  currentStock: number;
  needed: number;
  shortage: number;
  boxes: number;
  orderText: string;
};

export default function ProductOrderPage() {
  const { data: session } = useSession();
  const role = ((session as any)?.user as any)?.role as string | undefined;
  const NI = useNextIcons();
  const { showSuccess } = useSuccess();
  const { showError } = useError();

  const isDirector = role === "DIRECTOR" || role === "SENIOR_ADMIN";

  const { data: products, mutate } = useSWR<Product[]>(
    isDirector ? "/api/products/order/list" : null,
    fetcher
  );

  const { data: orderData, mutate: mutateOrder } = useSWR<{
    items: OrderItem[];
    text: string;
  }>(isDirector ? "/api/products/order/generate" : null, fetcher);

  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [officialName, setOfficialName] = useState("");
  const [quantityPerBox, setQuantityPerBox] = useState("");

  const handleEdit = (product: Product) => {
    setEditingProduct(product.id);
    setOfficialName(product.orderInfo?.officialName || "");
    setQuantityPerBox(String(product.orderInfo?.quantityPerBox || ""));
  };

  const handleSave = async (productId: string) => {
    try {
      const res = await fetch(`/api/products/order/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          officialName: officialName.trim() || null,
          quantityPerBox: quantityPerBox ? parseInt(quantityPerBox) : null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Ошибка сохранения");
      }

      showSuccess("Данные о заказе сохранены!");
      setEditingProduct(null);
      mutate();
      mutateOrder();
    } catch (error: any) {
      showError(error.message || "Ошибка сохранения данных");
    }
  };

  const handleCopyOrder = () => {
    if (orderData?.text) {
      navigator.clipboard.writeText(orderData.text);
      showSuccess("Список заказа скопирован в буфер обмена!");
    }
  };

  if (!isDirector) {
    return (
      <div className="card p-6 text-center">
        <p className="text-gray-400">Доступ запрещен. Только директор и управляющий могут управлять заказами товаров.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Заказ товаров</h1>
        <button
          onClick={handleCopyOrder}
          disabled={!orderData?.text}
          className="btn-primary flex items-center gap-2"
        >
          {NI ? <NI.FileText className="w-4 h-4" /> : "📋"} Копировать список
        </button>
      </div>

      {/* Список заказа */}
      {orderData && orderData.items.length > 0 && (
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Список товаров для заказа</h2>
          <div className="bg-gray-900 p-4 rounded border border-gray-700">
            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
              {orderData.text}
            </pre>
          </div>
        </div>
      )}

      {/* Товары с остатком <= 15 */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-white mb-4">
          Товары для заказа (остаток ≤ 15 шт.)
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Укажите официальное наименование и количество в коробке для каждого товара. Товары отсортированы по остатку (сначала с наименьшим остатком).
        </p>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="hidden lg:table-header-group">
              <tr className="text-left border-b" style={{ borderColor: "rgba(255, 0, 0, 0.2)" }}>
                <th className="p-3 text-white font-semibold">Товар</th>
                <th className="p-3 text-white font-semibold">Категория</th>
                <th className="p-3 text-white font-semibold">Подкатегория</th>
                <th className="p-3 text-white font-semibold">Остаток</th>
                <th className="p-3 text-white font-semibold">Официальное название</th>
                <th className="p-3 text-white font-semibold">Кол-во в коробке</th>
                <th className="p-3 text-white font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {(products || []).map((product) => {
                const isEditing = editingProduct === product.id;
                return (
                  <tr
                    key={product.id}
                    className="border-b hidden lg:table-row"
                    style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}
                  >
                    <td className="p-3 font-medium text-white">{product.name}</td>
                    <td className="p-3 text-gray-300">{product.categoryRef?.name ?? product.category ?? "—"}</td>
                    <td className="p-3 text-gray-300">{product.subcategory ?? "—"}</td>
                    <td className="p-3 text-gray-300 font-mono">{product.stock}</td>
                    <td className="p-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={officialName}
                          onChange={(e) => setOfficialName(e.target.value)}
                          placeholder="Официальное название"
                          className="w-full border rounded px-2 py-1 bg-gray-900 text-white border-gray-700"
                        />
                      ) : (
                        <span className="text-gray-300">
                          {product.orderInfo?.officialName || "—"}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {isEditing ? (
                        <input
                          type="number"
                          value={quantityPerBox}
                          onChange={(e) => setQuantityPerBox(e.target.value)}
                          placeholder="Кол-во в коробке"
                          min="1"
                          className="w-full border rounded px-2 py-1 bg-gray-900 text-white border-gray-700"
                        />
                      ) : (
                        <span className="text-gray-300">
                          {product.orderInfo?.quantityPerBox || "—"}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSave(product.id)}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                          >
                            Сохранить
                          </button>
                          <button
                            onClick={() => setEditingProduct(null)}
                            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
                          >
                            Отмена
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEdit(product)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                        >
                          {product.orderInfo ? "Изменить" : "Добавить"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Mobile view */}
          <div className="lg:hidden space-y-4 mt-4">
            {(products || []).map((product) => {
              const isEditing = editingProduct === product.id;
              return (
                <div
                  key={product.id}
                  className="border rounded p-4"
                  style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}
                >
                  <div className="space-y-3">
                    <div>
                      <div className="font-medium text-white mb-1">{product.name}</div>
                      <div className="text-xs text-gray-400">
                        Категория: {product.categoryRef?.name ?? product.category ?? "—"}
                      </div>
                      {product.subcategory && (
                        <div className="text-xs text-gray-400">
                          Подкатегория: {product.subcategory}
                        </div>
                      )}
                      <div className="text-xs text-gray-300 font-mono mt-1">
                        Остаток: {product.stock}
                      </div>
                    </div>

                    {isEditing ? (
                      <>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">
                            Официальное название
                          </label>
                          <input
                            type="text"
                            value={officialName}
                            onChange={(e) => setOfficialName(e.target.value)}
                            placeholder="Официальное название"
                            className="w-full border rounded px-2 py-1 bg-gray-900 text-white border-gray-700"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">
                            Количество в коробке
                          </label>
                          <input
                            type="number"
                            value={quantityPerBox}
                            onChange={(e) => setQuantityPerBox(e.target.value)}
                            placeholder="Кол-во в коробке"
                            min="1"
                            className="w-full border rounded px-2 py-1 bg-gray-900 text-white border-gray-700"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSave(product.id)}
                            className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                          >
                            Сохранить
                          </button>
                          <button
                            onClick={() => setEditingProduct(null)}
                            className="flex-1 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
                          >
                            Отмена
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Официальное название:</div>
                          <div className="text-sm text-gray-300">
                            {product.orderInfo?.officialName || "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Количество в коробке:</div>
                          <div className="text-sm text-gray-300">
                            {product.orderInfo?.quantityPerBox || "—"}
                          </div>
                        </div>
                        <button
                          onClick={() => handleEdit(product)}
                          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                        >
                          {product.orderInfo ? "Изменить" : "Добавить"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {(!products || products.length === 0) && (
          <div className="text-center py-8 text-gray-400">
            Нет товаров с остатком меньше или равно 15 шт.
          </div>
        )}
      </div>
    </div>
  );
}

