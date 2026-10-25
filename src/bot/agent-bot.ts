import { Bot } from "grammy";
import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import "dotenv/config";

const execAsync = promisify(exec);

// Config
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8823130269:AAF6d1LSo3LbDiLTkI9cZCgd3-mD6qIeB3c";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const WORKSPACE_DIR = process.cwd();

let ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID ? Number(process.env.TELEGRAM_ADMIN_CHAT_ID) : null;

if (!BOT_TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN is missing!");
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

// Модели с активной квотой (Lite-семейство имеет отдельный высокий лимит)
const CODING_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.5-flash",
];

const TRANSCRIBE_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.5-transcribe",
  "gemini-3.8-flash",
];

// Agent Tools Declaration for Gemini
const toolsDeclarations: any[] = [
  {
    name: "read_file",
    description: "Read contents of a file in the project workspace",
    parameters: {
      type: "OBJECT",
      properties: {
        filePath: { type: "STRING", description: "Relative path to file, e.g. src/app/page.tsx" },
      },
      required: ["filePath"],
    },
  },
  {
    name: "write_file",
    description: "Create or overwrite a file in the project workspace",
    parameters: {
      type: "OBJECT",
      properties: {
        filePath: { type: "STRING", description: "Relative path to file" },
        content: { type: "STRING", description: "Full new content of the file" },
      },
      required: ["filePath", "content"],
    },
  },
  {
    name: "list_directory",
    description: "List files and folders in a workspace directory",
    parameters: {
      type: "OBJECT",
      properties: {
        dirPath: { type: "STRING", description: "Relative path, e.g. src or . (root)" },
      },
    },
  },
  {
    name: "run_command",
    description: "Execute a shell command in the project directory (e.g. npm run build, npx prisma db push)",
    parameters: {
      type: "OBJECT",
      properties: {
        command: { type: "STRING", description: "Shell command to execute" },
      },
      required: ["command"],
    },
  },
];

// Tool Executors
async function executeTool(name: string, args: any): Promise<string> {
  try {
    if (name === "read_file") {
      const fullPath = path.resolve(WORKSPACE_DIR, args.filePath);
      if (!fs.existsSync(fullPath)) return `Error: File ${args.filePath} does not exist.`;
      const data = fs.readFileSync(fullPath, "utf-8");
      return data.slice(0, 50000);
    }

    if (name === "write_file") {
      const fullPath = path.resolve(WORKSPACE_DIR, args.filePath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, args.content, "utf-8");
      return `File ${args.filePath} saved successfully (${args.content.length} bytes).`;
    }

    if (name === "list_directory") {
      const targetDir = path.resolve(WORKSPACE_DIR, args.dirPath || ".");
      if (!fs.existsSync(targetDir)) return `Directory ${args.dirPath} not found.`;
      const entries = fs.readdirSync(targetDir, { withFileTypes: true });
      return entries
        .map((e) => `${e.isDirectory() ? "📁" : "📄"} ${e.name}`)
        .join("\n");
    }

    if (name === "run_command") {
      const { stdout, stderr } = await execAsync(args.command, {
        cwd: WORKSPACE_DIR,
        timeout: 60000,
      });
      return `STDOUT:\n${stdout}\n${stderr ? `STDERR:\n${stderr}` : ""}`;
    }

    return `Unknown tool: ${name}`;
  } catch (error: any) {
    return `Tool execution error (${name}): ${error.message}`;
  }
}

// System prompt
const SYSTEM_INSTRUCTION = `Ты — ведущий AI-разработчик системы автопроката в Грузии (VSL: Тбилиси, Батуми, Кутаиси).
Ты запущен прямо на Mac в рабочей папке проекта: ${WORKSPACE_DIR}.
Стек проекта: Next.js (App Router, TypeScript), Tailwind CSS, Prisma ORM, SQLite/PostgreSQL.

Пользователь отправляет тебе задачи через Telegram.
Твоя задача:
1. Внимательно понимать задачу пользователя.
2. Использовать инструменты (read_file, write_file, run_command, list_directory), чтобы исследовать код, вносить изменения и проверять проект.
3. Отвечать на русском языке кратко и емко: что было сделано или какой ответ на вопрос.`;

// Transcribe audio
async function transcribeAudio(ai: GoogleGenAI, base64Audio: string): Promise<string> {
  let lastErr = null;
  for (const m of TRANSCRIBE_MODELS) {
    try {
      const res = await ai.models.generateContent({
        model: m,
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: "audio/ogg",
                  data: base64Audio,
                },
              },
              {
                text: "Расшифруй это аудиосообщение на русском языке. Верни только распознанные слова без пояснений.",
              },
            ],
          },
        ],
      });
      const text = res.text?.trim();
      if (text) return text;
    } catch (err: any) {
      lastErr = err;
      console.warn(`Transcribe model ${m} failed: ${err.message}`);
    }
  }
  throw lastErr || new Error("Не удалось расшифровать аудио");
}

// Call Gemini with fallback
async function callGemini(ai: GoogleGenAI, contents: any[]): Promise<any> {
  let lastError = null;
  for (const model of CODING_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            tools: [{ functionDeclarations: toolsDeclarations }],
          },
        });
        return response;
      } catch (err: any) {
        lastError = err;
        console.warn(`Coding model ${model} (attempt ${attempt}) error: ${err.message}`);
        if (err.message?.includes("503") || err.message?.includes("UNAVAILABLE")) {
          await new Promise((r) => setTimeout(r, 1500));
        } else {
          break; // Switch to next model
        }
      }
    }
  }
  throw lastError;
}

// Start command
bot.command("start", async (ctx) => {
  const userId = ctx.from?.id;
  if (!ADMIN_CHAT_ID) {
    ADMIN_CHAT_ID = userId || null;
    await ctx.reply(
      `👋 Привет! Вы успешно авторизованы как администратор проекта (ID: ${userId}).\n\n` +
      `Я ваш AI-ассистент разработчика для автопроката в Грузии 🇬🇪.\n\n` +
      `🎙️ Вы можете надиктовывать мне задачи **голосовыми сообщениями** или писать текстом!\n` +
      `Я распознаю голос, выполню нужные правки в коде и пришлю результат.`
    );
  } else if (ADMIN_CHAT_ID === userId) {
    await ctx.reply(`🤖 Бот готов к работе! Присылайте голосовые или текстовые сообщения 🎙️.`);
  } else {
    await ctx.reply(`⛔ Доступ запрещен. Бот привязан к другому администратору.`);
  }
});

// Message handler
bot.on(["message:text", "message:voice"], async (ctx) => {
  const userId = ctx.from?.id;

  if (ADMIN_CHAT_ID && userId !== ADMIN_CHAT_ID) {
    await ctx.reply("⛔ У вас нет доступа к этому боту.");
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    await ctx.reply("⚠️ Для работы требуется GEMINI_API_KEY!");
    return;
  }

  if (ctx.message?.text?.startsWith("/setkey ")) {
    const key = ctx.message.text.replace("/setkey ", "").trim();
    process.env.GEMINI_API_KEY = key;
    await ctx.reply("✅ Новый API-ключ Gemini сохранен и готов к работе!");
    return;
  }

  const ai = new GoogleGenAI({ apiKey });
  let userTextPrompt = "";

  // 1. Handle Voice Message
  if (ctx.message?.voice) {
    const voiceMsg = await ctx.reply("🎧 Распознаю голос (Flash Lite)...");
    await ctx.replyWithChatAction("record_voice");

    try {
      const voiceFile = await ctx.getFile();
      const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${voiceFile.file_path}`;
      const audioRes = await fetch(fileUrl);
      const audioBuffer = await audioRes.arrayBuffer();
      const base64Audio = Buffer.from(audioBuffer).toString("base64");

      const recognized = await transcribeAudio(ai, base64Audio);

      try {
        await ctx.api.deleteMessage(ctx.chat.id, voiceMsg.message_id);
      } catch (_) {}

      if (!recognized) {
        await ctx.reply("❌ Не удалось разобрать слова в аудио. Попробуйте надиктовать еще раз или напишите текстом.");
        return;
      }

      await ctx.reply(`🎤 Распознано:\n«${recognized}»`);
      userTextPrompt = recognized;
    } catch (err: any) {
      console.error("Transcription error:", err);
      let errMsg = err.message || "";
      if (errMsg.includes("429") || errMsg.includes("quota")) {
        errMsg = "Суточный лимит бесплатных запросов на этом ключе исчерпан. Получите новый ключ на https://aistudio.google.com и отправьте команду /setkey НОВЫЙ_КЛЮЧ";
      }
      try {
        await ctx.api.editMessageText(
          ctx.chat.id,
          voiceMsg.message_id,
          `❌ Ошибка распознавания: ${errMsg}`
        );
      } catch (_) {}
      return;
    }
  } else if (ctx.message?.text) {
    userTextPrompt = ctx.message.text.trim();
  }

  if (!userTextPrompt) return;

  // 2. Execute Coding Task
  const statusMsg = await ctx.reply("⚙️ Работаю над задачей в проекте...");
  await ctx.replyWithChatAction("typing");

  try {
    let conversationHistory: any[] = [
      { role: "user", parts: [{ text: userTextPrompt }] },
    ];

    let turns = 0;
    const maxTurns = 8;
    let finalAnswer = "";

    while (turns < maxTurns) {
      turns++;

      const response = await callGemini(ai, conversationHistory);
      const candidate = response.candidates?.[0];
      const modelContent = candidate?.content;

      if (!modelContent) {
        finalAnswer = response.text || "Задача выполнена.";
        break;
      }

      const functionCalls = modelContent.parts?.filter((p: any) => p.functionCall);

      if (functionCalls && functionCalls.length > 0) {
        conversationHistory.push(modelContent);
        const functionResponseParts: any[] = [];

        for (const callPart of functionCalls) {
          const fn = callPart.functionCall!;
          try {
            await ctx.api.editMessageText(
              ctx.chat.id,
              statusMsg.message_id,
              `🛠️ Выполняю: ${fn.name}...`
            );
          } catch (_) {}

          const toolResult = await executeTool(fn.name, fn.args);

          functionResponseParts.push({
            functionResponse: {
              name: fn.name,
              response: { result: toolResult },
            },
          });
        }

        conversationHistory.push({
          role: "user",
          parts: functionResponseParts,
        });
      } else {
        const textFromParts = modelContent.parts?.filter((p: any) => p.text).map((p: any) => p.text).join("\n");
        finalAnswer = textFromParts || response.text || "Задача выполнена успешно.";
        break;
      }
    }

    try {
      await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
    } catch (_) {}

    if (!finalAnswer || !finalAnswer.trim()) {
      finalAnswer = "✅ Задача выполнена! Изменения применены к кодовой базе.";
    }

    if (finalAnswer.length > 4000) {
      for (let i = 0; i < finalAnswer.length; i += 4000) {
        await ctx.reply(finalAnswer.slice(i, i + 4000));
      }
    } else {
      await ctx.reply(finalAnswer);
    }
  } catch (err: any) {
    console.error("Bot execution error:", err);
    let errMsg = err.message || "";
    if (errMsg.includes("429") || errMsg.includes("quota")) {
      errMsg = "Исчерпан суточный лимит бесплатного ключа. Отправьте новый ключ командой /setkey НОВЫЙ_КЛЮЧ";
    }
    try {
      await ctx.api.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        `❌ Ошибка выполнения: ${errMsg}`
      );
    } catch (_) {
      await ctx.reply(`❌ Ошибка: ${errMsg}`);
    }
  }
});

// Launch bot
console.log("🚀 Starting Georgia Car Rental Telegram Coding Agent (Flash-Lite optimized)...");
bot.start({
  onStart: (info) => {
    console.log(`Bot @${info.username} is running on fresh Flash-Lite models!`);
  },
});
