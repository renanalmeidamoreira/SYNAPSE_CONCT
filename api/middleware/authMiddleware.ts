import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  userEmail?: string;
  userToken?: string;
}

/**
 * Middleware para validar cabeçalhos de autorização em rotas de API protegidas
 */
export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Se não houver token, permite requisições públicas ou marca como convidado
      req.userEmail = 'guest';
      return next();
    }

    const token = authHeader.substring(7).trim();
    req.userToken = token;

    // Em produção, tokens Firebase/Google podem ser validados aqui
    return next();
  } catch (err: unknown) {
    const errorObj = err as Error;
    console.error('[AuthMiddleware] Erro na validação de autorização:', errorObj.message);
    return res.status(401).json({
      success: false,
      error: 'Não autorizado ou token inválido.',
    });
  }
}
