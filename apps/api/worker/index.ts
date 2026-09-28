import { Container, getRandom } from "@cloudflare/containers";

const API_PORT = 3001;
const SITE_URL = "https://pigo.pungrumpy.com";

// Requests are spread across this many containers. Keep it at or below
// `max_instances` in wrangler.jsonc so a rollout has spare capacity.
const INSTANCE_COUNT = 3;

export class PigoApi extends Container<Env> {
  defaultPort = API_PORT;
  sleepAfter = "10m";
  // The API only answers requests and never calls out.
  enableInternet = false;

  constructor(ctx: DurableObjectState<Env>, env: Env) {
    super(ctx, env);
    this.envVars = {
      CORS_ALLOWED_ORIGINS: env.CORS_ALLOWED_ORIGINS,
      PORT: String(API_PORT),
    };
  }
}

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname === "/") {
      return Response.redirect(SITE_URL, 308);
    }

    const container = await getRandom(env.PIGO_API, INSTANCE_COUNT);
    return container.fetch(request);
  },
} satisfies ExportedHandler<Env>;
