// src/types/types.ts

// システム全体のステータス
// PREPARING: 準備中, WAITING: 出題待ち, ACTIVE: 出題中
export type SystemStatus = 'PREPARING' | 'WAITING' | 'ACTIVE';

// ユーザーの役割（既存のコードに合わせて UserRole も追加）
export type Role = 'admin' | 'lecturer' | 'student';
export type UserRole = 'ADMIN' | 'LECTURER' | 'STUDENT'; // page.tsxがこちらを求めています

// 小テストの問題データ
export interface Quiz {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string; 
}

// 生徒の解答データ
export interface StudentAnswer {
  uuid: string;
  quizId: string;
  answer: string;
}

// 【サーバーから受信するイベント】
export interface ServerToClientEvents {
  welcome: (message: string) => void;
  status_changed: (status: SystemStatus) => void;
  quiz_started: (quiz: Omit<Quiz, 'correctAnswer'>) => void;
  answer_count_updated: (count: number) => void;
  results_published: (correctAnswer: string) => void;
}

// 【サーバーへ送信するイベント】
export interface ClientToServerEvents {
  admin_set_status: (status: SystemStatus) => void;
  admin_create_quiz: (quiz: Quiz) => void;
  lecturer_start_quiz: (quizId: string) => void;
  student_submit_answer: (data: StudentAnswer) => void;
  lecturer_publish_results: () => void;
}