import { restartHeadroomProxy } from "@/lib/headroom/process";
import { createHeadroomTogglePost } from "@/lib/headroom/toggleRoute";

export const dynamic = "force-dynamic";

export const POST = createHeadroomTogglePost(restartHeadroomProxy);
