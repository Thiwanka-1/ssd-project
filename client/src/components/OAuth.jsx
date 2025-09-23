import { GoogleAuthProvider, signInWithPopup, getAuth } from 'firebase/auth';
import { app } from '../firebase';
import { useDispatch } from 'react-redux';
import { signInSuccess } from '../redux/user/userSlice';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function OAuth() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const handleGoogleClick = async () => {
        try {
        const provider = new GoogleAuthProvider();
        const auth = getAuth(app);
        const result = await signInWithPopup(auth, provider);
        const res = await axios.post('/api/auth/google', {
            name: result.user.displayName,
            email: result.user.email,
            photo: result.user.photoURL,
          }, {
            headers: {
              'Content-Type': 'application/json',
            },
            withCredentials: true, // to include cookies if necessary
          });
        const data = await res.data;
        dispatch(signInSuccess(data));
        navigate('/');
        }catch (error) {
            console.log("could not login with google",error);
        }
    }

  return (
    <button type='button' onClick={handleGoogleClick} className='bg-red-700 text-white rounded-lg p-3 uppercase hover:opacity-95'>Continue with google</button>
  )
}
