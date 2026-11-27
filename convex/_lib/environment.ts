/**
 * The deployment's environment from the Convex env var SITE_URL (convex/rules/environment.ts). Throws when it cannot
 * be told, so environment-specific seeding fails closed.
 */
import { environmentFromSiteUrl, type DeploymentEnvironment } from '../rules/environment';

export function deploymentEnvironment(): DeploymentEnvironment {
  const env = environmentFromSiteUrl(process.env.SITE_URL);
  if (env === 'unknown') {
    throw new Error('SITE_URL is not set to a known address on this deployment (npx convex env set SITE_URL …)');
  }
  return env;
}
