import {Navigate,Route,Routes} from 'react-router-dom';
import {Layout} from './components/Layout';
import {HomePage} from './pages/HomePage';
import {ArchivePage} from './pages/ArchivePage';
import {QuizPage} from './pages/QuizPage';
import {ResultPage} from './pages/ResultPage';
import {DossierPage} from './pages/DossierPage';
import {GeneratorPage} from './pages/GeneratorPage';
import {LoginPage} from './pages/LoginPage';
import {SignupPage} from './pages/SignupPage';
import {AccountPage} from './pages/AccountPage';
import {DiscoverPage} from './pages/DiscoverPage';
import {PublicProfilePage} from './pages/PublicProfilePage';
export default function App(){return <Routes><Route element={<Layout/>}><Route path="/" element={<HomePage/>}/><Route path="/archive" element={<ArchivePage/>}/><Route path="/test/:testId" element={<QuizPage/>}/><Route path="/result/:testId" element={<ResultPage/>}/><Route path="/dossier" element={<DossierPage/>}/><Route path="/generator" element={<GeneratorPage/>}/><Route path="/login" element={<LoginPage/>}/><Route path="/signup" element={<SignupPage/>}/><Route path="/account" element={<AccountPage/>}/><Route path="/discover" element={<DiscoverPage/>}/><Route path="/shinobi/:slug" element={<PublicProfilePage/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Route></Routes>}
