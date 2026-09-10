// Domain Hunter worker — serves static UI

export default {
  fetch(req: Request, env: any): Response {
    return env.ASSETS.fetch(req);
  },
};
