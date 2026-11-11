import { messageFor } from "@/lib/messages";
import { exportBackup } from "@/server/services/backup-service";
import { currentUserId } from "@/server/session";

/**
 * Laster ned brukerens oppskrifter som én JSON-fil (Story 6.15). Krever innlogging; filen
 * inneholder bare brukerens egne oppskrifter og lagres ikke i mellomlager.
 */
export async function GET(): Promise<Response> {
  const userId = await currentUserId();
  if (userId === null) {
    const message = messageFor("login_required");
    return new Response(`${message.title} ${message.body}`, { status: 401 });
  }
  const now = new Date();
  const result = exportBackup(userId, undefined, now);
  if (!result.ok) {
    const message = messageFor(result.error.kind);
    return new Response(`${message.title} ${message.body}`, { status: 500 });
  }
  return new Response(JSON.stringify(result.value, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="recipemate-oppskrifter-${now.toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
