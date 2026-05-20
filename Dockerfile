FROM node:22-slim

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/exercise-selection/package.json packages/exercise-selection/package.json
COPY packages/workout-execution/package.json packages/workout-execution/package.json
COPY packages/workout-generation/package.json packages/workout-generation/package.json

RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY shared shared
COPY apps/backend apps/backend
COPY packages packages

RUN pnpm run build:backend

EXPOSE 3000

CMD ["pnpm", "run", "start:backend"]
