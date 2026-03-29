import { JwtPayload } from "../auth/jwt-payload.interface";

declare module "socket.io" {
	interface Socket {
		data: {
			player?: JwtPayload;
		};
	}
}
