import type { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { sendData } from '../utils/apiResponse';
import type {
  LoginInput,
  LogoutInput,
  RefreshInput,
  SignupInput,
} from '../validators/auth.validator';

export const AuthController = {
  async signup(req: Request, res: Response): Promise<void> {
    const result = await AuthService.signup(req.body as SignupInput);
    sendData(res, result, 201);
  },

  async login(req: Request, res: Response): Promise<void> {
    const result = await AuthService.login(req.body as LoginInput);
    sendData(res, result, 200);
  },

  async refresh(req: Request, res: Response): Promise<void> {
    const tokens = await AuthService.refresh((req.body as RefreshInput).refreshToken);
    sendData(res, tokens, 200);
  },

  async logout(req: Request, res: Response): Promise<void> {
    await AuthService.logout((req.body as LogoutInput).refreshToken);
    sendData(res, { success: true }, 200);
  },
};
