"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const services = ["Steam", "PlayStation Store", "Xbox", "Nintendo eShop", "Discord Nitro", "Spotify"];

type Props = {
  accountsByService: Record<string, string[]>;
};

export function PaymentsPanel({ accountsByService }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [account, setAccount] = useState("");

  async function onPay(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      service: form.get("service"),
      account: form.get("account"),
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
      setSelectedService("");
      setAccount("");
      router.refresh();
    }
  }

  const accountSuggestions = selectedService ? accountsByService[selectedService] ?? [] : [];

  return (
    <section className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Оплата Steam и других сервисов</h2>
      <form onSubmit={onPay} className="mt-3 grid gap-3 md:grid-cols-4">
        <select
          name="service"
          required
          value={selectedService}
          onChange={(e) => {
            setSelectedService(e.target.value);
            setAccount("");
          }}
          className="rounded-md border border-[var(--input-border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
        >
          <option value="" className="bg-[var(--surface)] text-[var(--foreground)]">
            Выберите сервис
          </option>
          {services.map((service) => (
            <option key={service} value={service} className="bg-[var(--surface)] text-[var(--foreground)]">
              {service}
            </option>
          ))}
        </select>
        <div className="md:col-span-2">
          <input
            name="account"
            required
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            autoComplete="off"
            placeholder="Аккаунт"
            className="w-full rounded-md border border-[var(--input-border)] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          />
          {selectedService && accountSuggestions.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {accountSuggestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setAccount(item)}
                  className="rounded-md border border-[var(--surface-border)] px-2 py-1 text-xs text-[var(--muted)] transition-colors hover:bg-[var(--soft)]"
                >
                  {item}
                </button>
              ))}
            </div>
          ) : null}
          {selectedService === "Steam" ? (
            <p className="mt-1 text-xs text-amber-600">Внимательно проверяйте имя! Ошибочную оплату вернуть не получится.</p>
          ) : null}
        </div>
        <input
          name="amount"
          type="number"
          required
          min={1}
          placeholder="Сумма, ₽"
          className="rounded-md border border-[var(--input-border)] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
        />
        <button className="rounded-md bg-[var(--accent)] px-3 py-2 text-white transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] md:col-span-4">
          Оплатить
        </button>
      </form>
      {message ? <p className="mt-2 text-sm text-[var(--accent-strong)]">{message}</p> : null}
    </section>
  );
}
