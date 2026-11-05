import { createRemoteJWKSet, jwtVerify } from "jose";

// Cloudflare Access を通ったリクエストには、署名付きトークン（Cf-Access-Jwt-Assertion）が付く。
// Worker 側でも検証して、Access を迂回したアクセス（workers.dev への直アクセスなど）を拒否する。
// https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/

type AuthEnv = {
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  DEV_USER_EMAIL?: string;
};

const jwksByIssuer = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function jwksFor(issuer: string) {
  let jwks = jwksByIssuer.get(issuer);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
    jwksByIssuer.set(issuer, jwks);
  }
  return jwks;
}

/**
 * ログイン中のユーザー（メールアドレス、小文字）を返す。分からなければ null。
 * Access の設定があればトークンを検証する。設定がなければ、開発用の DEV_USER_EMAIL（.dev.vars）だけを使う。
 * どちらもなければ null（＝拒否）。設定漏れで誰でも開ける状態にならないようにするため。
 */
export async function resolveUser(request: Request, env: AuthEnv): Promise<string | null> {
  const domain = env.ACCESS_TEAM_DOMAIN?.replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (domain && env.ACCESS_AUD) {
    const token = request.headers.get("cf-access-jwt-assertion");
    if (!token) return null;
    const issuer = `https://${domain}`;
    try {
      const { payload } = await jwtVerify(token, jwksFor(issuer), { issuer, audience: env.ACCESS_AUD });
      return typeof payload.email === "string" ? payload.email.toLowerCase() : null;
    } catch {
      return null;
    }
  }
  return env.DEV_USER_EMAIL ? env.DEV_USER_EMAIL.toLowerCase() : null;
}
