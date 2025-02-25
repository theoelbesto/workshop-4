import { launchUsers } from "../users/launchUsers";
import { launchOnionRouters } from "../onionRouters/launchOnionRouters";

export async function launchNetwork(userCount: number, routerCount: number) {
  const userServers = await launchUsers(userCount);
  const routerServers = await launchOnionRouters(routerCount);

  const servers = [...userServers, ...routerServers];

  // Filter out any null values
  return servers.filter(server => server !== null);
}
