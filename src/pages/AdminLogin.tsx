import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, auth } from '../api';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  if (auth.logado()) return <Navigate to="/admin" replace />;

  const entrar = async (e: FormEvent) => {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      const { token } = await api.login(usuario, senha);
      auth.salvar(token);
      navigate('/admin', { replace: true });
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <form className="card login" onSubmit={entrar}>
      <h1>🔒 Área do administrador</h1>
      {erro && <div className="alerta erro">{erro}</div>}
      <label>
        Usuário
        <input value={usuario} onChange={(e) => setUsuario(e.target.value)} autoFocus required />
      </label>
      <label>
        Senha
        <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
      </label>
      <button className="btn btn-primario btn-bloco" disabled={carregando}>
        {carregando ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}
