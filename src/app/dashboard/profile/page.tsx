"use client";
import { useState, useEffect } from "react";
import useSWR from "swr";
import { useNextIcons } from "@/components/NI";
import { useSuccess } from "@/components/SuccessProvider";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ProfilePage() {
  const NI = useNextIcons();
  const { showSuccess } = useSuccess();
  const { data: profile, mutate } = useSWR("/api/profile", fetcher);
  
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"SBP" | "BANK_CARD" | "">("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setPhone(profile.employee?.phone || "");
      setPaymentMethod(profile.employee?.paymentMethod || "");
      setPhoneNumber(profile.employee?.phoneNumber || "");
      setCardNumber(profile.employee?.cardNumber || "");
      setBankName(profile.employee?.bankName || "");
    }
  }, [profile]);
  
  const handleSave = async () => {
    if (password && password !== confirmPassword) {
      alert("Пароли не совпадают");
      return;
    }
    
    if (password && password.length < 6) {
      alert("Пароль должен быть не менее 6 символов");
      return;
    }
    
    setSaving(true);
    try {
      const payload: any = { name, phone, paymentMethod, bankName };
      if (password) payload.password = password;
      
      // В зависимости от метода оплаты добавляем соответствующий номер
      if (paymentMethod === "SBP") {
        payload.phoneNumber = phoneNumber;
        payload.cardNumber = undefined;
      } else if (paymentMethod === "BANK_CARD") {
        payload.cardNumber = cardNumber;
        payload.phoneNumber = undefined;
      } else {
        payload.phoneNumber = undefined;
        payload.cardNumber = undefined;
      }
      
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) throw new Error("Ошибка при сохранении");
      
      showSuccess("Профиль обновлен!");
      setPassword("");
      setConfirmPassword("");
      mutate();
    } catch (error) {
      alert("Ошибка при обновлении профиля");
    } finally {
      setSaving(false);
    }
  };
  
  if (!profile) {
    return <div className="card p-4 text-white">Загрузка...</div>;
  }
  
  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h1 className="text-xl font-bold text-white mb-4">Мой профиль</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-2 text-white">Имя</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded px-3 py-2 bg-gray-900 text-white border-gray-700 focus:border-red-500 focus:ring-1 focus:ring-red-500"
              placeholder="Ваше имя"
            />
          </div>
          
          <div>
            <label className="block text-sm mb-2 text-white">Телефон</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border rounded px-3 py-2 bg-gray-900 text-white border-gray-700 focus:border-red-500 focus:ring-1 focus:ring-red-500"
              placeholder="+7 (___) ___-__-__"
            />
          </div>
          
          <div>
            <label className="block text-sm mb-2 text-white">Новый пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded px-3 py-2 bg-gray-900 text-white border-gray-700 focus:border-red-500 focus:ring-1 focus:ring-red-500"
              placeholder="Оставьте пустым, если не хотите менять"
            />
          </div>
          
          {password && (
            <div>
              <label className="block text-sm mb-2 text-white">Подтвердите пароль</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border rounded px-3 py-2 bg-gray-900 text-white border-gray-700 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                placeholder="Подтвердите пароль"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm mb-2 text-white">Способ выплаты</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full border rounded px-3 py-2 bg-gray-900 text-white border-gray-700 focus:border-red-500 focus:ring-1 focus:ring-red-500"
            >
              <option value="">Не выбран</option>
              <option value="SBP">СБП</option>
              <option value="BANK_CARD">Банковская карта</option>
            </select>
          </div>
          
          {paymentMethod === "SBP" && (
            <div>
              <label className="block text-sm mb-2 text-white">Номер телефона для СБП</label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full border rounded px-3 py-2 bg-gray-900 text-white border-gray-700 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                placeholder="+7 (___) ___-__-__"
              />
            </div>
          )}
          
          {paymentMethod === "BANK_CARD" && (
            <div>
              <label className="block text-sm mb-2 text-white">Номер банковской карты</label>
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                className="w-full border rounded px-3 py-2 bg-gray-900 text-white border-gray-700 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                placeholder="0000 0000 0000 0000"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm mb-2 text-white">Банк</label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full border rounded px-3 py-2 bg-gray-900 text-white border-gray-700 focus:border-red-500 focus:ring-1 focus:ring-red-500"
              placeholder="Название банка"
            />
          </div>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            {NI ? <NI.Save className="w-4 h-4" /> : "💾"} {saving ? "Сохранение..." : "Сохранить изменения"}
          </button>
        </div>
      </div>
    </div>
  );
}

