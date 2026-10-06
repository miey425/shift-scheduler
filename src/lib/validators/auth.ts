import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("メールアドレスの形式が正しくありません。"),
  password: z.string().min(1, "パスワードを入力してください。"),
});
