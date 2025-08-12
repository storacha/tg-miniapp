# 🤝 Contributing

Thanks for your interest in contributing! Storacha is open-source and welcomes community involvement.

This is a full-stack app built with [Next.js](https://nextjs.org/) using Node.js v18 and [pnpm](https://pnpm.io/). Since it’s a Telegram Mini App, it doesn't run like a traditional web app — it must be launched inside Telegram and linked to a bot.

If you're submitting a pull request, be sure to follow our [PR Guidelines](#pr-guidelines).

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

### 4. Expose your local server

Set up [ngrok](https://ngrok.com) to expose your local server:

```bash
ngrok http 3000 --url spicy-rooster-fondly.ngrok-free.app
```

> ⚠️ Tip: Use a static domain to avoid updating your Telegram app settings every time the URL changes.

### 5. Database Setup

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

#### ⚠️ Before you run db migrations

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

### 6. Set up your telegram app

Since this app needs to be launched within Telegram, you'll need a bot and a Mini App configured with Telegram. Please see the "Run it inside Telegram" section below for more information on how to get this running.

## Dev Deployment Setup

Alternatively, you may wish to run in a production-like environment with development code. Dev deployment is handled via terraform using a Makefile - follow the
instructions below to get yours set up.

### 1. Install prerequisites

- Install and properly configured `aws` cli tool
- Install OpenTofu (OpenTofu is a fork of Terraform that retains a full open source license -- please use OpenTofu when deploying Storacha services in order to avoid licensing issues).

```terminal
brew update
brew install opentofu
tofu -u version
```

- Install Docker (DockerDesktop for Mac for example)

### 2. Configure your environment variables

From the `deploy` directory:

1. Copy `.env.terraform.tpl` to `.env.terraform`
2. Fill out the missing variables in `.env.terraform` (put your name in for TF_WORKSPACE for dev purposes)
3. Ask in Discord if you're unsure how to configure some variables.

### 3. Deploy!

From the `deploy` directory:

1. Run `make apply` -- the first time you run this, it will take a LONG time to deploy everything - also you'll have to confirm deploying various things a few times along the way
2. If all is well, there's still a "blue-green" deployment to finish, so you'll want to `make wait-deploy` to wait for that to complete
3. Lastly, run `make migrate` to run migrations on the remote database

Your environment should be deployed at `~your-name~.telegram.storacha.network`

## 🌐 Run it inside Telegram

### 1. Create a bot using [BotFather](https://t.me/botfather)

- Start a chat with BotFather.
- Use the `/newbot` command.
- Follow the instructions to create your bot and get your **bot token**.

### 2. Link your bot to the Mini App

- In the BotFather chat, send `/newapp`.
- Follow the steps to:

  - Link your bot.
  - Set your `ngrok` URL as the app endpoint if you're running locally and the URL of your dev environment if you're using a dev deployment (ie, `~your-name~.telegram.storacha.network`)

- Your app will be available at:
  `https://t.me/<your_bot_username>/<your_app_name>`

🔗 Extra reference: [Creating a new app – Telegram Docs](https://docs.telegram-mini-apps.com/platform/creating-new-app)


### 3. Get Telegram API credentials

🔐 Telegram API Access (for chat backup)

While the Bot API lets you interact with your own bot, it **does not** provide access to user chat history (dialogs). To access private chats, you’ll need to use **TDLib (Telegram Database Library)**.

1. Go to [my.telegram.org](https://my.telegram.org).
2. Log in with your Telegram account.
3. Click **API development tools**.
4. Create a new app to get your **API ID** and **API Hash**.

These credentials allow your app to authenticate as a user (not just a bot) and access messages and chat history through TDLib.


## PR Guidelines

We welcome and value contributions from the community! To help us review and merge your pull request (PR) efficiently, please follow these guidelines:

### 📝 How should I write my commits?

We use [Conventional Commits](https://www.conventionalcommits.org/) to power automatic changelogs and releases via [Release Please](https://github.com/googleapis/release-please).

#### Use these prefixes:

- `fix:` – Bug fixes → _SemVer patch_
- `feat:` – New features → _SemVer minor_
- `chore:`- tasks that don't directly impact the functionality of your application but are important for maintaining a clean, functional codebase
- `feat!:`, `fix!:`, etc. – Breaking changes → _SemVer major_

### Before You Open a PR

- **Describe your change clearly:** Summarize what your PR does and why. If it addresses an issue, link to it in the description.

- **Keep PRs focused:** Submit small, focused PRs that address a single topic or problem. Large or unrelated changes are harder to review and may be delayed.

- **Follow the code style:** Match the existing code style and patterns. Run linting and formatting using the commands defined in `app/package.json`.

- **Test your changes:** Run the app and verify your changes work as expected.


### Review & Merge Process

To keep maintenance sustainable, we follow a predictable timeline:

1. **Review:**
  - A reviewer will provide specific, actionable feedback and mark the PR as “Changes requested”.
  - The PR will be labeled `awaiting-author`.

2. **Response Window:**
  - If there is no response (commits or comments) within 10 days, the PR will be marked as `stale`.
  - If there is still no activity after an additional 4 days, the PR may be closed.

3. **Reopening & Exceptions:**
  - If your PR is closed, you can:
    - Push new commits to the same branch and ask a maintainer to reopen, or
    - Open a new PR referencing the closed one.
  - Maintainers may exempt PRs from closure if they are:
    - Labeled `blocked` or `maintainer-will-finish`,
    - Clearly in-progress with active discussion, or
    - Time-sensitive and acknowledged by maintainers.

4. **Reviewer Responsibilities:**
  - Provide a concise summary and a checklist of requested changes.
  - Clearly distinguish between blocking and optional feedback.

### Tips for a Smooth Contribution

- **AI-assisted changes:** If you used AI to help with your contribution:
  - Thoroughly review all AI generated code - you **MUST** understand and be able to answer questions about all code you submit in a PR.
  - Run and verify the code locally.
  - Be ready to adjust based on review feedback.

- **Celebrate your contribution:** We appreciate every PR, thank you for helping improve Storacha!