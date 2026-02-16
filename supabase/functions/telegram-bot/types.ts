// types.ts
export interface User {
    id: string;
    chat_id: number;
    phone: string;
    username: string;
    club_id: number;
    subscription_id: number;
    subscription_date: string;
  }
  
  export interface Session {
    id: string;
    chat_id: number;
    state: string;
    context: SessionContext;
    last_updated: string;
  }
  
  export enum BotState {
    WAITING_COMMAND = 'WAITING_COMMAND',
    WAITING_NAME = 'WAITING_NAME',
    WAITING_PHONE = 'WAITING_PHONE',
    WAITING_BAG_NUMBER = 'WAITING_BAG_NUMBER',
    WAITING_TARIFF_SELECTION = 'WAITING_TARIFF_SELECTION',
    WAITING_PACKAGE = 'WAITING_PACKAGE',
    WAITING_RECEIPT = 'WAITING_RECEIPT',
    WAITING_PICKUP_CODE = 'WAITING_PICKUP_CODE',
    WAITING_RATING = 'WAITING_RATING',
    WAITING_RATING_COMMENT = 'WAITING_RATING_COMMENT',
    WAITING_PHOTO_ORDER_ID = 'WAITING_PHOTO_ORDER_ID',
    WAITING_PHOTO_UPLOAD = 'WAITING_PHOTO_UPLOAD',
  }
  
  export interface TelegramUpdate {
    update_id: number;
    message?: TelegramMessage;
    callback_query?: TelegramCallbackQuery;
  }
  
  export interface TelegramMessage {
    message_id: number;
    from: TelegramUser;
    chat: TelegramChat;
    date: number;
    text?: string;
    document?: TelegramDocument;
    caption?: string;
  }
  
  export interface TelegramCallbackQuery {
    id: string;
    from: TelegramUser;
    message: TelegramMessage;
    data: string;
  }
  
  export interface TelegramUser {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
  }
  
  export interface TelegramChat {
    id: number;
    type: string;
    first_name?: string;
    last_name?: string;
    username?: string;
  }
  
  export interface TelegramDocument {
    file_id: string;
    file_unique_id: string;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
  }
  
  export interface SessionContext {
    username: string;
    phone: string;
    bag_number?: string;
    tariff_type?: string;
    package_id: string;
    order_id?: string;
    rating?: number;
    photo_type?: 'received' | 'processed' | 'ready';
  }