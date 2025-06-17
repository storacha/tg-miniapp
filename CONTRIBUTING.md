# 🤝 Contributing

Thanks for your interest in contributing! Storacha is open-source and welcomes community involvement.

This is a full-stack app built with [Next.js](https://nextjs.org/) using Node.js v18 and [pnpm](https://pnpm.io/). Since it’s a Telegram Mini App, it doesn't run like a traditional web app — it must be launched inside Telegram and linked to a bot.

If you're submitting a pull request, be sure to follow our [commit message guidelines](#how-should-i-write-my-commits).

## 🛠️ Local Development Setup

### 1. Clone the repo and install dependencies

```bash
cd app
pnpm install
```

### 2. Set up environment variables

```bash
cp .env.tpl .env
```

Edit the `.env` file with your credentials as needed.

### 3. Run the development server

```bash
pnpm dev
```

### 🌐 Run it inside Telegram

Since this app needs to be launched within Telegram, you'll need a bot and a Mini App configured with Telegram.

### 4. Expose your local server

Set up [ngrok](https://ngrok.com) to expose your local server:

```bash
ngrok http 3000 --url spicy-rooster-fondly.ngrok-free.app
```

> ⚠️ Tip: Use a static domain to avoid updating your Telegram app settings every time the URL changes.

### 🤖 Set up the Telegram Bot

### 5. Use Telegram’s test environment

Since this is for development, it's best to start with Telegram’s test environment. [This guide](https://docs.telegram-mini-apps.com/platform/test-environment) will help you create a test account.

### 6. Create a bot using [BotFather](https://t.me/botfather)

- Start a chat with BotFather.
- Use the `/newbot` command.
- Follow the instructions to create your bot and get your **bot token**.

### 🧩 Create a Telegram Mini App (TMA)

### 7. Link your bot to the Mini App

- In the BotFather chat, send `/newapp`.
- Follow the steps to:

  - Link your bot.
  - Set your `ngrok` URL as the app endpoint.

- Your app will be available at:
  `https://t.me/<your_bot_username>/<your_app_name>`

🔗 Extra reference: [Creating a new app – Telegram Docs](https://docs.telegram-mini-apps.com/platform/creating-new-app)

## 🔐 Telegram API Access (for chat backup)

While the Bot API lets you interact with your own bot, it **does not** provide access to user chat history (dialogs). To access private chats, you’ll need to use **TDLib (Telegram Database Library)**.

### 8. Get Telegram API credentials

1. Go to [my.telegram.org](https://my.telegram.org).
2. Log in with your Telegram account.
3. Click **API development tools**.
4. Create a new app to get your **API ID** and **API Hash**.

These credentials allow your app to authenticate as a user (not just a bot) and access messages and chat history through TDLib.

### Database Setup

We use PostgreSQL for data storage. The easiest way to get started is using Docker Compose (optional):

```bash
# From the root directory of the project
docker compose up -d
```

This will start a PostgreSQL server with the following configuration:

- Host: localhost
- Port: 5432
- Username: admin
- Password: tarjay
- Database: tg_backups_dev

Run database migrations with:

```bash
cd app
pnpm db:migrate
```

## ⚠️ Before you run db migrations

After setup you'll need to create your development database. If you're on a Mac (OSX) install postgres

```bash
brew install postgresql
```

You may need to start the postgres service after installation with

```bash
brew services start postgresql
```

If you're on Linux, refer to [this](https://www.digitalocean.com/community/tutorials/how-to-install-postgresql-on-ubuntu-22-04-quickstart). I think it works quite well for other distros, feel free to compare.

Use `psql` to start a database session;

```bash
psql
```

If this is your first time setting up postgres on your machine. There's a chance the command above fails when you run it. If that happens, try the one below instead:

```bash
psql postgres
```

And then in the SQL console:

```sql
create database tg_backups_dev;
create role admin with login password 'tarjay';
grant all privileges on database tg_backups_dev to admin;
```

Now run `pnpm db:migrate`

## 📝 How should I write my commits?

We use [Conventional Commits](https://www.conventionalcommits.org/) to power automatic changelogs and releases via [Release Please](https://github.com/googleapis/release-please).

### Use these prefixes:

- `fix:` – Bug fixes → _SemVer patch_
- `feat:` – New features → _SemVer minor_
- `feat!:`, `fix!:`, etc. – Breaking changes → _SemVer major_
