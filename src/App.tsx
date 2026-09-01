import {Component,lazy,Suspense,type CSSProperties,type ErrorInfo,type ReactNode} from 'react';
import {Navigate,Outlet,Route,Routes,useNavigate} from 'react-router-dom';
import {useAuth} from './contexts/AuthContext';
import {clanThemes} from './data/clans';
import {useArchive} from './store/useArchive';

const ArchivePage=lazy(()=>import('./pages/IdentityPages').then(m=>({default:m.ArchivePage})));
const DossierPage=lazy(()=>import('./pages/IdentityPages').then(m=>({default:m.DossierPage})));
const QuizPage=lazy(()=>import('./pages/IdentityPages').then(m=>({default:m.QuizPage})));
const ResultPage=lazy(()=>import('./pages/IdentityPages').then(m=>({default:m.ResultPage})));
const GeneratorPage=lazy(()=>import('./pages/GeneratorPage').then(m=>({default:m.GeneratorPage})));
const AccountPage=lazy(()=>import('./pages/AccountPages').then(m=>({default:m.AccountPage})));
const HomePage=lazy(()=>import('./pages/AccountPages').then(m=>({default:m.HomePage})));
const LoginPage=lazy(()=>import('./pages/AccountPages').then(m=>({default:m.LoginPage})));
const SignupPage=lazy(()=>import('./pages/AccountPages').then(m=>({default:m.SignupPage})));
const DiscoverPage=lazy(()=>import('./pages/CommunityPages').then(m=>({default:m.DiscoverPage})));
const PublicProfilePage=lazy(()=>import('./pages/CommunityPages').then(m=>({default:m.PublicProfilePage})));
const ArsenalPage=lazy(()=>import('./pages/SystemPages').then(m=>({default:m.ArsenalPage})));
const ChroniclePage=lazy(()=>import('./pages/SystemPages').then(m=>({default:m.ChroniclePage})));
const MissionsPage=lazy(()=>import('./pages/SystemPages').then(m=>({default:m.MissionsPage})));
const MatchupsPage=lazy(()=>import('./pages/SocialPages').then(m=>({default:m.MatchupsPage})));
const RivalsPage=lazy(()=>import('./pages/SocialPages').then(m=>({default:m.RivalsPage})));
const TeamsPage=lazy(()=>import('./pages/SocialPages').then(m=>({default:m.TeamsPage})));
const CooperativeMissionsPage=lazy(()=>import('./pages/SocialPages').then(m=>({default:m.CooperativeMissionsPage})));
const VillageWarsPage=lazy(()=>import('./pages/SocialPages').then(m=>({default:m.VillageWarsPage})));
const VillagesPage=lazy(()=>import('./pages/WorldPages').then(m=>({default:m.VillagesPage})));
const VillagePage=lazy(()=>import('./pages/WorldPages').then(m=>({default:m.VillagePage})));
const CareerPage=lazy(()=>import('./pages/WorldPages').then(m=>({default:m.CareerPage})));
const TrainingPage=lazy(()=>import('./pages/WorldPages').then(m=>({default:m.TrainingPage})));
const WorldEventsPage=lazy(()=>import('./pages/WorldPages').then(m=>({default:m.WorldEventsPage})));
const RoguePathPage=lazy(()=>import('./pages/WorldPages').then(m=>({default:m.RoguePathPage})));
const BingoBookPage=lazy(()=>import('./pages/WorldPages').then(m=>({default:m.BingoBookPage})));
const ExamsPage=lazy(()=>import('./pages/CompetitivePages').then(m=>({default:m.ExamsPage})));
const SeasonsPage=lazy(()=>import('./pages/CompetitivePages').then(m=>({default:m.SeasonsPage})));

const mainNav = [
  ['/discover','Discover'],
  ['/villages','Villages'],
  ['/career','Career'],
  ['/training','Training'],
  ['/world','World'],
  ['/rogue','Rogue'],
  ['/bingo-book','Bingo Book'],
  ['/exams','Exams'],
  ['/seasons','Seasons'],
  ['/arsenal','Arsenal'],
  ['/missions','Missions'],
  ['/teams','Teams'],
  ['/operations','Co-op'],
  ['/wars','Wars'],
  ['/chronicle','Chronicle'],
] as const;

function RouteFallback(){return <div className="screen"><p className="muted">Loading archive module…</p></div>}

class RouteErrorBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true}}
  componentDidCatch(error:Error,info:ErrorInfo){console.error('Route render failed',error,info.componentStack)}
  render(){
    if(this.state.failed)return <div className="screen"><p className="eyebrow">MODULE ERROR</p><h2>This part of the archive could not load.</h2><p className="muted">A deployment may have changed while this tab was open. Reload to fetch the current application files.</p><button className="primary" onClick={()=>window.location.reload()}>Reload archive</button></div>;
    return this.props.children;
  }
}

export function Layout(){
  const navigate=useNavigate();
  const clan=useArchive(state=>state.results.clan?.winner);
  const theme=clan?clanThemes[clan]:undefined;
  const {user,configured}=useAuth();
  const style=theme?{'--accent':theme.accent,'--accent2':theme.accent2,'--glow':theme.glow} as CSSProperties:undefined;

  return <main className="app" style={style}>
    <header className="brand">
      <button className="brand-left brand-btn" onClick={()=>navigate('/archive')}>
        <span className="crest">忍</span>
        <span><strong>Shinobi Identity Archive</strong><small>identity platform</small></span>
      </button>
      <div className="brand-actions">
        {mainNav.map(([path,label])=><button className="nav-chip" key={path} onClick={()=>navigate(path)}>{label}</button>)}
        <span className="edition">V11 · INTERACTIVE</span>
        {configured&&<button className="account-chip" onClick={()=>navigate(user?'/account':'/login')}>{user?'My Account':'Sign In'}</button>}
      </div>
    </header>
    <section className="card route-stage"><RouteErrorBoundary><Suspense fallback={<RouteFallback/>}><Outlet/></Suspense></RouteErrorBoundary></section>
    <footer>Unofficial fan-made personality experience. React + TypeScript · V{__APP_VERSION__} · Identity, living villages, team operations, village wars, dynamic world events, rogue shinobi, training, jutsu mastery, equipment, competitive seasons, missions, social systems, and chronicle.</footer>
  </main>;
}

export default function App(){
  return <Routes><Route element={<Layout/>}>
    <Route path="/" element={<HomePage/>}/>
    <Route path="/archive" element={<ArchivePage/>}/>
    <Route path="/test/:testId" element={<QuizPage/>}/>
    <Route path="/result/:testId" element={<ResultPage/>}/>
    <Route path="/dossier" element={<DossierPage/>}/>
    <Route path="/generator" element={<GeneratorPage/>}/>
    <Route path="/login" element={<LoginPage/>}/>
    <Route path="/signup" element={<SignupPage/>}/>
    <Route path="/account" element={<AccountPage/>}/>
    <Route path="/discover" element={<DiscoverPage/>}/>
    <Route path="/villages" element={<VillagesPage/>}/>
    <Route path="/villages/:villageId" element={<VillagePage/>}/>
    <Route path="/career" element={<CareerPage/>}/>
    <Route path="/training" element={<TrainingPage/>}/>
    <Route path="/world" element={<WorldEventsPage/>}/>
    <Route path="/rogue" element={<RoguePathPage/>}/>
    <Route path="/bingo-book" element={<BingoBookPage/>}/>
    <Route path="/exams" element={<ExamsPage/>}/>
    <Route path="/seasons" element={<SeasonsPage/>}/>
    <Route path="/arsenal" element={<ArsenalPage/>}/>
    <Route path="/missions" element={<MissionsPage/>}/>
    <Route path="/teams" element={<TeamsPage/>}/>
    <Route path="/operations" element={<CooperativeMissionsPage/>}/>
    <Route path="/wars" element={<VillageWarsPage/>}/>
    <Route path="/rivals" element={<RivalsPage/>}/>
    <Route path="/matchups" element={<MatchupsPage/>}/>
    <Route path="/chronicle" element={<ChroniclePage/>}/>
    <Route path="/shinobi/:slug" element={<PublicProfilePage/>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Route></Routes>;
}
