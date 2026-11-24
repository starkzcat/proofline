import { Router } from 'express';
import { demoSwitchSchema, loginSchema } from '@proofline/shared';
import { authenticate } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { demoSwitch, login, logout, me } from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/login', validateBody(loginSchema), login);
authRouter.post('/logout', logout);
authRouter.get('/me', authenticate, me);
authRouter.post('/demo-switch', validateBody(demoSwitchSchema), demoSwitch);
