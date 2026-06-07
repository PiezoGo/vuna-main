import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Peer } from 'peerjs';
import api from '../utils/api';
import { helpContent } from '../utils/helpContent';
import {
  HelpCircle,
  User,
  X,
  CheckCircle,
  Compass,
  Sprout,
  ShoppingBag,
  LogOut,
  Phone,
  PhoneCall,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff
} from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Auth state from localStorage
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  
  // Modal states
  const [showHelp, setShowHelp] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [activeHelpTab, setActiveHelpTab] = useState('general');
  
  // Profile Form state
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    city: '',
    market: '',
    bio: '',
    avatar: '👤'
  });
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  // calling states
  const [peer, setPeer] = useState(null);
  const [callState, setCallState] = useState('idle'); // idle, ringing, calling, active
  const [activeCall, setActiveCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callUser, setCallUser] = useState({ uid: '', name: '', avatar: '👤' });
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Update user state when localStorage changes or token is set
  useEffect(() => {
    const userString = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    setToken(storedToken);
    if (userString) {
      const parsedUser = JSON.parse(userString);
      setUser(parsedUser);
      setProfileForm({
        full_name: parsedUser.full_name || '',
        email: parsedUser.email || '',
        phone_number: parsedUser.phone_number || '',
        city: parsedUser.city || '',
        market: parsedUser.market || '',
        bio: parsedUser.bio || '',
        avatar: parsedUser.avatar || '👤'
      });
    } else {
      setUser(null);
    }
  }, [showProfile]); // Re-sync when profile modal toggles

  // Sync token and user status on render / route changes
  useEffect(() => {
    const userString = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    setToken(storedToken);
    if (userString) {
      setUser(JSON.parse(userString));
    } else {
      setUser(null);
    }
  }, [location.pathname]);

  // PeerJS Connection and Signaling Initialization
  useEffect(() => {
    if (!user) {
      if (peer) {
        peer.destroy();
        setPeer(null);
      }
      return;
    }

    const newPeer = new Peer(user.uid.replace(/-/g, ''), {
      host: 'peerjs.com',
      secure: true,
      port: 443
    });

    newPeer.on('open', (id) => {
      console.log('PeerJS initialized for user UID:', id);
    });

    newPeer.on('error', (err) => {
      console.error('PeerJS service error:', err);
    });

    newPeer.on('call', (incomingCall) => {
      console.log('Receiving call from:', incomingCall.peer);
      
      // Auto-decline if we're busy
      if (callState !== 'idle') {
        incomingCall.close();
        return;
      }

      const callerName = incomingCall.metadata?.callerName || 'Farmer / Buyer';
      const callerAvatar = incomingCall.metadata?.callerAvatar || '👤';

      setCallUser({ uid: incomingCall.peer, name: callerName, avatar: callerAvatar });
      setCallState('ringing');
      setActiveCall(incomingCall);
    });

    setPeer(newPeer);

    return () => {
      newPeer.destroy();
    };
  }, [user ? user.uid : null]);

  // Global listener for call initiation requests from other pages
  useEffect(() => {
    const handleInitiateCall = async (event) => {
      const { userId, userName, userAvatar } = event.detail;
      
      if (!peer) {
        alert('Calling service not ready yet. Please try again.');
        return;
      }
      if (callState !== 'idle') {
        alert('You are already in a call.');
        return;
      }

      setCallUser({ uid: userId, name: userName || 'Farmer / Buyer', avatar: userAvatar || '👤' });
      setCallState('calling');

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        setAudioMuted(false);
        setVideoMuted(false);

        const call = peer.call(userId.replace(/-/g, ''), stream, {
          metadata: {
            callerName: user.full_name,
            callerAvatar: user.avatar || '👤'
          }
        });

        setActiveCall(call);

        call.on('stream', (rStream) => {
          setRemoteStream(rStream);
          setCallState('active');
        });

        call.on('close', () => {
          endCallCleanup();
        });

        call.on('error', (err) => {
          console.error('Call connection error:', err);
          alert('Call failed to connect: ' + err.message);
          endCallCleanup();
        });

      } catch (err) {
        console.error('Permission denied or devices missing:', err);
        alert('Could not access your camera/microphone. Please ensure permissions are granted.');
        endCallCleanup();
      }
    };

    window.addEventListener('initiate-call', handleInitiateCall);
    return () => {
      window.removeEventListener('initiate-call', handleInitiateCall);
    };
  }, [peer, callState, user]);

  // Handle local video element binding
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callState]);

  // Handle remote video element binding
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callState]);

  if (!token || !user) return null;

  const handleLogout = () => {
    if (peer) {
      peer.destroy();
      setPeer(null);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    navigate('/login');
  };

  const isFarmerPage = location.pathname.startsWith('/farmer');

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess(false);
    setProfileLoading(true);

    try {
      const response = await api.put('profile/', {
        full_name: profileForm.full_name,
        email: profileForm.email,
        phone_number: profileForm.phone_number,
        city: profileForm.city,
        market: profileForm.market,
        bio: profileForm.bio,
        avatar: profileForm.avatar
      });

      const updatedUser = {
        ...user,
        ...response.data
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      setProfileSuccess(true);
      setTimeout(() => {
        setProfileSuccess(false);
        setShowProfile(false);
      }, 2000);
    } catch (err) {
      console.error(err);
      setProfileError(err.response?.data ? Object.entries(err.response.data).map(([key, val]) => `${key}: ${val}`).join(', ') : 'Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  // WebRTC Call actions
  const acceptCall = async () => {
    if (!activeCall) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      setAudioMuted(false);
      setVideoMuted(false);

      activeCall.answer(stream);
      setCallState('active');

      activeCall.on('stream', (rStream) => {
        setRemoteStream(rStream);
      });

      activeCall.on('close', () => {
        endCallCleanup();
      });

      activeCall.on('error', (err) => {
        console.error('Call connection error:', err);
        endCallCleanup();
      });

    } catch (err) {
      console.error('Could not accept call:', err);
      alert('Could not access camera/microphone. Call declined.');
      declineCall();
    }
  };

  const declineCall = () => {
    if (activeCall) {
      activeCall.close();
      setActiveCall(null);
    }
    setCallState('idle');
  };

  const endCallCleanup = () => {
    if (activeCall) {
      activeCall.close();
      setActiveCall(null);
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    setCallState('idle');
    setAudioMuted(false);
    setVideoMuted(false);
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoMuted(!videoTrack.enabled);
      }
    }
  };

  const renderIcon = (iconName, className) => {
    switch (iconName) {
      case 'Compass': return <Compass className={className} />;
      case 'Sprout': return <Sprout className={className} />;
      case 'ShoppingBag': return <ShoppingBag className={className} />;
      default: return <HelpCircle className={className} />;
    }
  };

  const avatarPresets = ['👤', '🌾', '🚜', '🍎', '🥦', '🐄', '🌽', '🍯'];

  return (
    <>
      <header className="sticky top-0 bg-white border-b border-primary/10 z-40 px-4 py-3 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-black tracking-tight text-primary">Vuna</span>
            <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">B2B</span>
          </Link>

          {/* Navigation & Controls */}
          <div className="flex items-center space-x-3">
            {user.role === 'both' && (
              <button
                onClick={() => {
                  if (isFarmerPage) {
                    navigate('/buyer/dashboard');
                  } else {
                    navigate('/farmer/dashboard');
                  }
                }}
                className="text-xs bg-primary/10 text-primary font-semibold px-3 py-2 rounded-lg hover:bg-primary/20 transition duration-200"
              >
                {isFarmerPage ? 'Switch to Buyer Mode' : 'Switch to Farmer Mode'}
              </button>
            )}

            {/* Help Button */}
            <button
              onClick={() => setShowHelp(true)}
              className="p-2 text-gray-500 hover:text-primary hover:bg-gray-50 rounded-lg transition duration-200 flex items-center space-x-1"
              title="Help Guide"
              id="nav-help-btn"
            >
              <HelpCircle size={18} />
              <span className="hidden sm:inline text-xs font-semibold">Help</span>
            </button>

            {/* Profile Edit Button */}
            <button
              onClick={() => setShowProfile(true)}
              className="p-2 text-gray-500 hover:text-primary hover:bg-gray-50 rounded-lg transition duration-200 flex items-center space-x-1"
              title="Edit Profile"
              id="nav-profile-btn"
            >
              <User size={18} />
              <span className="hidden sm:inline text-xs font-semibold">Profile</span>
            </button>

            {/* User display details */}
            <div className="hidden md:flex flex-col text-right">
              <span className="text-sm font-semibold text-gray-800 flex items-center justify-end gap-1.5">
                <span className="text-base">{user.avatar || '👤'}</span>
                <span>{user.full_name}</span>
              </span>
              <span className="text-[10px] text-gray-500 capitalize">{user.role === 'both' ? 'Farmer & Buyer' : user.role}</span>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="text-xs border border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100 font-medium px-3 py-2 rounded-lg transition duration-200 flex items-center space-x-1"
            >
              <LogOut size={14} className="sm:hidden" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Floating Action Help Button */}
      <button
        onClick={() => setShowHelp(true)}
        className="fixed bottom-6 right-6 z-40 bg-primary hover:bg-primary-light text-white p-3.5 rounded-full shadow-2xl flex items-center justify-center transition duration-300 hover:scale-110 active:scale-95 cursor-pointer border border-white/20"
        title="Quick Help Guide"
        id="floating-help-btn"
      >
        <HelpCircle size={24} />
      </button>

      {/* INCOMING CALL TOAST */}
      {callState === 'ringing' && (
        <div className="fixed top-20 right-4 md:right-10 z-50 bg-white rounded-2xl shadow-2xl border border-primary/10 p-5 w-80 animate-scaleIn flex flex-col gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-2xl font-bold">
              {callUser.avatar}
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-sm leading-tight">{callUser.name}</h4>
              <p className="text-xs text-primary font-semibold flex items-center space-x-1.5 mt-1 animate-pulse">
                <PhoneCall size={13} className="animate-bounce" />
                <span>Incoming Call...</span>
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={declineCall}
              className="flex-1 py-2 px-3 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-xl transition"
            >
              Decline
            </button>
            <button
              onClick={acceptCall}
              className="flex-1 py-2 px-3 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-xl shadow-lg shadow-green-600/15 transition"
            >
              Accept
            </button>
          </div>
        </div>
      )}

      {/* CALL OVERLAY MODAL */}
      {(callState === 'calling' || callState === 'active') && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-4xl h-[80vh] bg-gray-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between">
            {/* Video Feed Area */}
            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
              {callState === 'calling' ? (
                <div className="text-center text-white space-y-4">
                  <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center text-4xl font-bold mx-auto border border-primary/30 animate-pulse">
                    {callUser.avatar}
                  </div>
                  <div>
                    <h3 className="font-bold text-xl">{callUser.name}</h3>
                    <p className="text-xs text-gray-400 mt-1.5 animate-pulse">Calling...</p>
                  </div>
                </div>
              ) : (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              )}

              {/* Local Stream Thumbnail (PIP) */}
              {localStream && (
                <div className="absolute top-4 right-4 w-32 h-44 sm:w-40 sm:h-52 bg-gray-800 rounded-2xl overflow-hidden border border-white/20 shadow-2xl z-10">
                  {videoMuted ? (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 bg-gray-900 select-none">
                      Camera Off
                    </div>
                  ) : (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              )}
              
              {/* Partner Name Banner (Active Mode) */}
              {callState === 'active' && (
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs font-semibold select-none flex items-center gap-1.5 border border-white/10">
                  <span>{callUser.avatar}</span>
                  <span>{callUser.name}</span>
                </div>
              )}
            </div>

            {/* Call Control Center */}
            <div className="bg-gray-950 p-6 flex items-center justify-center gap-4 shrink-0 border-t border-white/5">
              <button
                onClick={toggleAudio}
                disabled={callState !== 'active'}
                className={`p-3.5 rounded-full transition duration-200 border ${
                  audioMuted
                    ? 'bg-red-500/15 border-red-500/30 text-red-500 hover:bg-red-500/25'
                    : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                } disabled:opacity-50`}
                title={audioMuted ? "Unmute Microphone" : "Mute Microphone"}
              >
                {audioMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              <button
                onClick={endCallCleanup}
                className="p-4 bg-red-600 hover:bg-red-700 text-white rounded-full transition duration-200 shadow-lg shadow-red-600/30 hover:scale-105 active:scale-95"
                title="End Call"
              >
                <PhoneOff size={24} />
              </button>

              <button
                onClick={toggleVideo}
                disabled={callState !== 'active'}
                className={`p-3.5 rounded-full transition duration-200 border ${
                  videoMuted
                    ? 'bg-red-500/15 border-red-500/30 text-red-500 hover:bg-red-500/25'
                    : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                } disabled:opacity-50`}
                title={videoMuted ? "Turn Camera On" : "Turn Camera Off"}
              >
                {videoMuted ? <VideoOff size={20} /> : <Video size={20} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HELP MODAL OVERLAY */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" onClick={() => setShowHelp(false)}>
          <div 
            className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-primary/10 overflow-hidden flex flex-col max-h-[85vh] animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary/10 text-primary rounded-xl">
                  <HelpCircle size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 leading-tight">{helpContent.title}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Learn how to make the most of Vuna</p>
                </div>
              </div>
              <button 
                onClick={() => setShowHelp(false)} 
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto py-4 flex flex-col md:flex-row gap-6">
              {/* Tab selectors (Sidebar on Desktop, Top Bar on Mobile) */}
              <div className="flex md:flex-col gap-1 overflow-x-auto shrink-0 md:w-52 pb-2 md:pb-0 border-b md:border-b-0 md:border-r border-gray-100 pr-0 md:pr-4">
                {helpContent.navigationSections.map((section) => (
                  <button
                    key={section.role}
                    onClick={() => setActiveHelpTab(section.role)}
                    className={`flex items-center space-x-2 py-2 px-3 text-xs font-semibold rounded-xl transition duration-150 whitespace-nowrap md:w-full ${
                      activeHelpTab === section.role
                        ? 'bg-primary text-white shadow-md shadow-primary/15'
                        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    {renderIcon(section.icon, "w-4 h-4")}
                    <span>{section.title}</span>
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 space-y-4">
                <p className="text-xs text-gray-600 italic">
                  {helpContent.description}
                </p>
                
                {helpContent.navigationSections
                  .filter(sec => sec.role === activeHelpTab)
                  .map(sec => (
                    <div key={sec.role} className="space-y-3">
                      {sec.items.map((item, idx) => (
                        <div key={idx} className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 hover:border-primary/10 transition">
                          <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                            {item.title}
                          </h4>
                          <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{item.details}</p>
                        </div>
                      ))}
                    </div>
                  ))}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowHelp(false)}
                className="py-2 px-5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-light transition shadow-lg shadow-primary/10"
              >
                Got it, thanks!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROFILE EDIT MODAL OVERLAY */}
      {showProfile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" onClick={() => setShowProfile(false)}>
          <div 
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-primary/10 overflow-hidden flex flex-col max-h-[90vh] animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary/10 text-primary rounded-xl">
                  <User size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 leading-tight">Edit Profile</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Manage your identity on Vuna B2B</p>
                </div>
              </div>
              <button 
                onClick={() => setShowProfile(false)} 
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto py-4">
              {profileSuccess && (
                <div className="mb-4 bg-green-50 border border-green-200 text-green-600 text-xs rounded-xl p-3.5 flex items-center space-x-2">
                  <CheckCircle size={16} />
                  <span className="font-semibold">Profile updated successfully! Closing...</span>
                </div>
              )}

              {profileError && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl p-3">
                  {profileError}
                </div>
              )}

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                {/* Avatar selection */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Choose Avatar</label>
                  <div className="flex flex-wrap gap-2">
                    {avatarPresets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setProfileForm({ ...profileForm, avatar: preset })}
                        className={`w-10 h-10 text-xl flex items-center justify-center rounded-xl border-2 transition ${
                          profileForm.avatar === preset
                            ? 'border-primary bg-primary/5 scale-110 shadow-sm'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    required
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder="e.g. Jane Doe"
                  />
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Email Address</label>
                    <input
                      type="email"
                      required
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                      placeholder="jane@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Phone Number</label>
                    <input
                      type="text"
                      required
                      value={profileForm.phone_number}
                      onChange={(e) => setProfileForm({ ...profileForm, phone_number: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                      placeholder="0712345678"
                    />
                  </div>
                </div>

                {/* City & Market */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">City</label>
                    <input
                      type="text"
                      required
                      value={profileForm.city}
                      onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                      placeholder="e.g. Nairobi"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Market Location</label>
                    <input
                      type="text"
                      required
                      value={profileForm.market}
                      onChange={(e) => setProfileForm({ ...profileForm, market: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                      placeholder="e.g. Wakulima"
                    />
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Bio / Description (Optional)</label>
                  <textarea
                    rows="3"
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder="Tell other farmers and buyers about yourself..."
                  />
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-gray-100 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowProfile(false)}
                    className="py-2.5 px-4 border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="py-2.5 px-5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-light transition shadow-lg shadow-primary/20"
                  >
                    {profileLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
