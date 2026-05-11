// app/page.js — redirect a /login
import { redirect } from 'next/navigation';
export default function Home() {
  redirect('/login');
}
