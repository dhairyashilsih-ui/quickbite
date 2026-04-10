import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Zap, ShieldAlert, CheckCircle } from 'lucide-react';
import { magicLoginAPI } from '../utils/api';
import { getDeviceId, getDeviceBrand } from '../utils/deviceInfo';
import './Login.css';

export default function MagicLogin() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  
  const [status, setStatus] = useState('Verifying your magic link...');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('No token found in the URL.');
      setError(true);
      return;
    }

    const verifyToken = async () => {
      try {
        const deviceId = getDeviceId();
        const deviceBrand = getDeviceBrand();
        
        const res = await magicLoginAPI({ token, deviceId, deviceBrand });
        
        if (res.data.success) {
          setStatus('Authentication successful! Trusting device...');
          localStorage.setItem('projectx_token', res.data.token);
          localStorage.setItem('projectx_role', res.data.role);
          
          setTimeout(() => {
            navigate('/admin');
          }, 1500);
        }
      } catch (err) {
        setStatus(err.response?.data?.message || 'Magic Link invalid or expired.');
        setError(true);
      }
    };

    verifyToken();
  }, [token, navigate]);

  return (
    <div className="login-page">
      <div className="aurora" />
      <div className="login-card glass-card" style={{textAlign: 'center', padding: '60px 40px'}}>
        <div style={{ marginBottom: 24, display:'flex', justifyContent:'center'}}>
           {error ? <ShieldAlert size={48} color="var(--clr-error)"/> 
                  : (status.includes('successful') 
                      ? <CheckCircle size={48} color="var(--clr-success)"/> 
                      : <div className="spinner" style={{width: 48, height: 48, borderWidth: 3}}/>)}
        </div>
        <h2 style={{color: '#fff', fontSize: '1.4rem'}}>{error ? 'Verification Failed' : 'Authenticating...'}</h2>
        <p className="text-muted" style={{marginTop: 10}}>{status}</p>
        
        {error && (
          <button className="btn btn-outline" style={{marginTop: 30}} onClick={() => navigate('/')}>
            Back to Login
          </button>
        )}
      </div>
    </div>
  );
}
