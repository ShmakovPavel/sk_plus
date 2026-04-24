# SK Plus

Веб-платформа для семьи с механикой целей, оплатой онлайн-сервисов, викториной и админ-панелью.

## Что реализовано

- Вход и регистрация с ролями `родитель`/`ребёнок`
- Семейные связи parent-child: поиск, запрос, подтверждение
- Механика целей "Накопи на мечту":
  - цель с этапами и суммами
  - загрузка фото/видео-доказательства по этапу
  - подтверждение этапа родителем с переводом суммы в копилку ребёнка
  - визуальный прогресс цели
- Главная страница: профиль, баланс, текущие цели и этапы, блок оплаты
- Оплата сервисов (Steam и другие) с историей
- Викторина:
  - 15 вопросов по 15 секунд (или кастомное число от админа)
  - 4 варианта ответов A/Б/В/Г
  - блокировка на 3 секунды при ошибке
  - начисление очков по скорости ответа
  - лог первого верного ответа по текущему вопросу
  - рейтинги TOP-50: ежедневный, ежемесячный, ежегодный, за все время
- Админ-панель:
  - просмотр и редактирование пользователей
  - блокировка / разблокировка
  - выдача / снятие администратора
  - редактирование вопросов викторины
  - принудительный запуск викторины с количеством вопросов
- База данных через Prisma + SQLite (данные не в файлах)

## Быстрый старт

```bash
npm install
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

Открыть: [http://localhost:3000](http://localhost:3000)

## Демо-аккаунты

- `parent@sk.plus` / `12345678`
- `child@sk.plus` / `12345678`
- `admin@sk.plus` / `12345678`

## Стек

- Next.js (App Router, TypeScript)
- Tailwind CSS
- Prisma ORM + SQLite
- bcryptjs (хеш паролей)
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
