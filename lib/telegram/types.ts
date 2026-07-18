// lib/telegram/types.ts
// Tipos minimos de la Telegram Bot API que usa el bot. Subconjunto tipado a
// mano: solo los campos que el codigo lee de verdad, mas algunos opcionales
// reales de la API por conveniencia. Referencia: https://core.telegram.org/bots/api

/** Usuario de Telegram (quien envia el mensaje o pulsa el boton). */
export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

/** Chat donde ocurre la conversacion (para el bot, siempre "private"). */
export interface TelegramChat {
  id: number;
  type: string;
  title?: string;
  username?: string;
  first_name?: string;
}

/** Nota de voz adjunta a un mensaje. */
export interface TelegramVoice {
  file_id: string;
  file_unique_id: string;
  duration: number;
  mime_type?: string;
  file_size?: number;
}

/** Mensaje entrante o saliente. */
export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  voice?: TelegramVoice;
  caption?: string;
}

/** Pulsacion de un boton inline (confirmar / cancelar). */
export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  chat_instance?: string;
  data?: string;
}

/**
 * Update crudo que llega por webhook o getUpdates. El index signature permite
 * ignorar sin error los demas tipos de update que Telegram pueda enviar.
 */
export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
  [key: string]: unknown;
}

/** Boton inline con callback_data (unico tipo de boton que usa el bot). */
export interface InlineKeyboardButton {
  text: string;
  callback_data: string;
}

/** Teclado inline: matriz de filas de botones. */
export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}
