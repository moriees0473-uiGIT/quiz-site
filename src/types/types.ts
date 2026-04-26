// システム全体のステータス
// PREPARING: 準備中, WAITING: 出題待ち, ACTIVE: 出題中
export type SystemStatus = 'PREPARING' | 'WAITING' | 'ACTIVE';

// ユーザーの役割
export type Role = 'admin' | 'lecturer' | 'student';

// 小テストの問題データ
export interface Quiz {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string; // 正解（例: 'A' や '0' など）
}

// 生徒の解答データ
export interface StudentAnswer {
  uuid: string;
  quizId: string;
  answer: string;
}

// --- WebSocket (Socket.IO) 用のイベント定義 ---

// 【サーバーから受信するイベント（フロント側でリッスン）】
export interface ServerToClientEvents {
  welcome: (message: string) => void;
  status_changed: (status: SystemStatus) => void;
  // 生徒へ出題する時は、正解(correctAnswer)を除外して送信する
  quiz_started: (quiz: Omit<Quiz, 'correctAnswer'>) => void;
  answer_count_updated: (count: number) => void;
  results_published: (correctAnswer: string) => void;
}

// 【サーバーへ送信するイベント（バック側でリッスン）】
/*
export interface ClientToServerEvents {
  admin_set_status: (status: SystemStatus) => void;
  lecturer_start_quiz: (quizId: string) => void;
  student_submit_answer: (data: StudentAnswer) => void;
  lecturer_publish_results: () => void;
}
*/

// ClientToServerEvents の中に以下を追加（上書き）
export interface ClientToServerEvents {
  admin_set_status: (status: SystemStatus) => void;
  admin_create_quiz: (quiz: Quiz) => void; // ★追加
  lecturer_start_quiz: (quizId: string) => void;
  student_submit_answer: (data: StudentAnswer) => void;
  lecturer_publish_results: () => void;
}