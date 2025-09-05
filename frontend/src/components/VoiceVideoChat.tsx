import React, { useState, useRef, useEffect } from 'react';
import Peer from 'simple-peer';

interface VoiceVideoChatProps {
  socket: any;
  user: any;
  roomName: string;
  disabled?: boolean;
}

const VoiceVideoChat: React.FC<VoiceVideoChatProps> = ({
  socket,
  user,
  roomName,
  disabled = false
}) => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  const myVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<any>(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('call_user', (data: any) => {
      setIncomingCall(data);
    });

    socket.on('call_accepted', (signal: any) => {
      setCallAccepted(true);
      if (peerRef.current) {
        peerRef.current.signal(signal);
      }
    });

    socket.on('call_ended', () => {
      endCall();
    });

    return () => {
      socket.off('call_user');
      socket.off('call_accepted');
      socket.off('call_ended');
    };
  }, [socket]);

  const startCall = async (video: boolean = false) => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: video,
        audio: true
      });
      
      setStream(mediaStream);
      setIsAudioEnabled(true);
      setIsVideoEnabled(video);
      setIsCallActive(true);
      
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = mediaStream;
      }

      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream: mediaStream
      });

      peer.on('signal', (signal: any) => {
        socket.emit('call_user', {
          room: roomName,
          signal,
          from: user?.displayName || user?.name,
          video
        });
      });

      peer.on('stream', (remoteStream: any) => {
        setRemoteStream(remoteStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      });

      peerRef.current = peer;
    } catch (error) {
      console.error('Error starting call:', error);
      alert('Could not access camera/microphone');
    }
  };

  const acceptCall = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: incomingCall.video,
        audio: true
      });
      
      setStream(mediaStream);
      setIsAudioEnabled(true);
      setIsVideoEnabled(incomingCall.video);
      setIsCallActive(true);
      setCallAccepted(true);
      
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = mediaStream;
      }

      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream: mediaStream
      });

      peer.on('signal', (signal: any) => {
        socket.emit('accept_call', {
          room: roomName,
          signal,
          to: incomingCall.from
        });
      });

      peer.on('stream', (remoteStream: any) => {
        setRemoteStream(remoteStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      });

      peer.signal(incomingCall.signal);
      peerRef.current = peer;
      setIncomingCall(null);
    } catch (error) {
      console.error('Error accepting call:', error);
      alert('Could not access camera/microphone');
    }
  };

  const endCall = () => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    setRemoteStream(null);
    setIsCallActive(false);
    setCallAccepted(false);
    setIsAudioEnabled(false);
    setIsVideoEnabled(false);
    setIncomingCall(null);
    
    socket.emit('end_call', { room: roomName });
  };

  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  return (
    <div className="voice-video-chat">
      {/* Call Controls */}
      {!isCallActive && (
        <div className="flex gap-2">
          <button
            onClick={() => startCall(false)}
            disabled={disabled}
            className={`
              p-2 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            title="Start voice call"
          >
            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
          </button>
          
          <button
            onClick={() => startCall(true)}
            disabled={disabled}
            className={`
              p-2 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            title="Start video call"
          >
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            </svg>
          </button>
        </div>
      )}

      {/* Active Call Controls */}
      {isCallActive && (
        <div className="flex gap-2">
          <button
            onClick={toggleAudio}
            className={`
              p-2 rounded-md transition-colors
              ${isAudioEnabled ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}
            `}
            title={isAudioEnabled ? 'Mute audio' : 'Unmute audio'}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              {isAudioEnabled ? (
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM15.657 6.343a1 1 0 011.414 0A9.972 9.972 0 0119 12a9.972 9.972 0 01-1.929 5.657 1 1 0 11-1.414-1.414A7.971 7.971 0 0017 12c0-2.21-.896-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 12a5.984 5.984 0 01-.757 2.828 1 1 0 11-1.415-1.414A3.984 3.984 0 0013 12a3.983 3.983 0 00-.172-1.172 1 1 0 010-1.414z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
              )}
            </svg>
          </button>
          
          {isVideoEnabled && (
            <button
              onClick={toggleVideo}
              className={`
                p-2 rounded-md transition-colors
                ${isVideoEnabled ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'}
              `}
              title={isVideoEnabled ? 'Turn off video' : 'Turn on video'}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              </svg>
            </button>
          )}
          
          <button
            onClick={endCall}
            className="p-2 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
            title="End call"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
          </button>
        </div>
      )}

      {/* Incoming Call Modal */}
      {incomingCall && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Incoming {incomingCall.video ? 'Video' : 'Voice'} Call
            </h3>
            <p className="text-gray-600 mb-6">
              {incomingCall.from} is calling you
            </p>
            <div className="flex gap-3">
              <button
                onClick={acceptCall}
                className="flex-1 bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition-colors"
              >
                Accept
              </button>
              <button
                onClick={() => setIncomingCall(null)}
                className="flex-1 bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition-colors"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Streams */}
      {isCallActive && isVideoEnabled && (
        <div className="fixed bottom-4 right-4 z-40">
          <div className="bg-black rounded-lg overflow-hidden shadow-lg">
            {/* Remote Video */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-64 h-48 object-cover"
            />
            {/* Local Video (Picture-in-Picture) */}
            <video
              ref={myVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute bottom-2 right-2 w-16 h-12 object-cover border-2 border-white rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceVideoChat;