import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import AuthForm from '@/components/AuthForm';
export default async function Register(){ if(await getCurrentUser()) redirect('/dashboard'); return <AuthForm mode="register"/>; }
