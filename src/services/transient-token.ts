import jwt from "jsonwebtoken";

export class TransientTokenService {
	private secret: string;

	constructor() {
		this.secret = process.env.JWT_SECRET || String(Math.random());
	}

	verifyTransientToken(token: string, options?: jwt.VerifyOptions): any {
		try {
			return jwt.verify(token, this.secret, options);
		} catch (error) {
			throw new Error("Invalid or expired token");
		}
	}

	generateTransientToken(payload: any, expiresIn: string = "10m"): string {
		return jwt.sign(payload, this.secret, { expiresIn });
	}
}