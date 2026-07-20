import { redirect } from "next/navigation";

/** The root route immediately routes into the app (or login via middleware). */
export default function HomePage() {
  redirect("/dashboard");
}
