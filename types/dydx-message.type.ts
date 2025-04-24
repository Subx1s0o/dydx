export interface DydxSocketMessage {
  type: string;
  connection_id: string;
  message_id: number;
  id: string;
  channel: string;
  version: string;
  contents: any;
}
