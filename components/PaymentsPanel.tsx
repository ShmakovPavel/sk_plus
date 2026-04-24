"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const services = ["Steam", "PlayStation Store", "Xbox", "Nintendo eShop", "Discord Nitro", "Spotify"];

export function PaymentsPanel() {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function onPay(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      service: form.get("service"),
      amount: Number(form.get("amount")),
    };

    const res = await fetch("/api/payments/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setMessage(res.ok ? "Оплата проведена" : data.error);
    if (res.ok) {
      (e.target as HTMLFormElement).reset();
      router.refresh();
    }
  }

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Оплата Steam и других сервисов</h2>
      <form onSubmit={onPay} className="mt-3 grid gap-3 md:grid-cols-3">
        <select name="service" required className="rounded-md border border-zinc-300 px-3 py-2">
          <option value="">Выберите сервис</option>
          {services.map((service) => (
            <option key={service} value={service}>
              {service}
            </option>
          ))}
        </select>
        <input
          name="amount"
          type="number"
          required
          min={1}
          placeholder="Сумма, ₽"
          className="rounded-md border border-zinc-300 px-3 py-2"
        />
        <button className="rounded-md bg-emerald-600 px-3 py-2 text-white">Оплатить</button>
      </form>
      {message ? <p className="mt-2 text-sm text-blue-700">{message}</p> : null}
    </section>
  );
}
