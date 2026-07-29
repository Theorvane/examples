import { z } from "zod";

const PETSTORE_BASE_URL = "https://petstore.swagger.io/v2";

const rawPetSchema = z.object({
	id: z.number().int().nonnegative(),
	name: z.string(),
	photoUrls: z.array(z.string()).optional(),
	status: z.string().optional(),
	category: z
		.object({
			name: z.string(),
		})
		.optional(),
});

const inventorySchema = z.record(z.string(), z.number().finite().nonnegative());

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export type PetstorePet = Readonly<{
	id: number;
	name: string;
	status: string | undefined;
	category?: string;
}>;

export type PetstoreClientOptions = Readonly<{
	fetch: FetchLike;
	timeoutMs: number;
}>;

export class PetstoreClient {
	readonly #fetch: FetchLike;
	readonly #timeoutMs: number;

	public constructor(options: PetstoreClientOptions) {
		if (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0) {
			throw new Error("timeoutMs must be a positive finite number");
		}
		this.#fetch = options.fetch;
		this.#timeoutMs = options.timeoutMs;
	}

	public async findAvailablePets(): Promise<readonly PetstorePet[]> {
		const payload = await this.#getJson("/pet/findByStatus?status=available");
		const arrayPayload = z.array(z.unknown()).safeParse(payload);
		if (!arrayPayload.success) {
			throw new Error(
				"Swagger Petstore returned an invalid available-pet payload",
			);
		}
		const pets = arrayPayload.data
			.map((candidate) => rawPetSchema.safeParse(candidate))
			.flatMap((candidate) =>
				candidate.success ? [normalizePet(candidate.data)] : [],
			);
		if (pets.length === 0) {
			throw new Error(
				"Swagger Petstore returned no valid available-pet records",
			);
		}
		return pets;
	}

	public async getPet(petId: number): Promise<PetstorePet> {
		if (!Number.isInteger(petId) || petId <= 0) {
			throw new Error("petId must be a positive integer");
		}
		const payload = await this.#getJson(`/pet/${petId}`);
		const parsed = rawPetSchema.safeParse(payload);
		if (!parsed.success) {
			throw new Error("Swagger Petstore returned an invalid pet payload");
		}
		return normalizePet(parsed.data);
	}

	public async getInventory(): Promise<Readonly<Record<string, number>>> {
		const payload = await this.#getJson("/store/inventory");
		const parsed = inventorySchema.safeParse(payload);
		if (!parsed.success) {
			throw new Error("Swagger Petstore returned an invalid inventory payload");
		}
		return parsed.data;
	}

	async #getJson(path: string): Promise<unknown> {
		const response = await this.#fetch(`${PETSTORE_BASE_URL}${path}`, {
			method: "GET",
			headers: { accept: "application/json" },
			signal: AbortSignal.timeout(this.#timeoutMs),
		});
		if (!response.ok) {
			throw new Error(
				`Swagger Petstore GET ${path.split("?")[0]} failed with HTTP ${response.status}`,
			);
		}
		return response.json();
	}
}

function normalizePet(pet: z.infer<typeof rawPetSchema>): PetstorePet {
	return {
		id: pet.id,
		name: pet.name,
		status: pet.status,
		...(pet.category === undefined ? {} : { category: pet.category.name }),
	};
}

export function createLivePetstoreClient(timeoutMs = 10_000): PetstoreClient {
	return new PetstoreClient({ fetch: globalThis.fetch, timeoutMs });
}
