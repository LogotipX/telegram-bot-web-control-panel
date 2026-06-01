export interface Chat {
  id: number;
  title: string;
  type: string;
}

export interface Message {
  id: number;
  text: string;
  from: string;
  fromId: number;
  date: number;
  chatId: number;
  isBot: boolean;
}
