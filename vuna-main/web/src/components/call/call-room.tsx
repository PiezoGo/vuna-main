"use client";

import { Room, RoomEvent, Track, VideoPresets, type RemoteTrack } from "livekit-client";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import type { JoinInfo } from "@/features/calls/store";
import { cn } from "@/lib/utils";

type Props = { join: JoinInfo; video: boolean; onLeave: (reason: string) => void };

function useTimer(running: boolean) {
  const [seconds, setSeconds] = React.useState(0);
  React.useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1_000);
    return () => clearInterval(timer);
  }, [running]);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** The connected call (LiveKit): audio always, video when switched on (360p to save data). */
export function CallRoom({ join, video, onLeave }: Props) {
  const roomRef = React.useRef<Room | null>(null);
  const remoteRef = React.useRef<HTMLDivElement>(null);
  const selfRef = React.useRef<HTMLVideoElement>(null);
  const [connected, setConnected] = React.useState(false);
  const [micOn, setMicOn] = React.useState(true);
  const [camOn, setCamOn] = React.useState(video);
  const [remoteVideo, setRemoteVideo] = React.useState(false);
  const [problem, setProblem] = React.useState<string | null>(null);
  const timer = useTimer(connected);
  const leaveRef = React.useRef(onLeave);
  React.useEffect(() => {
    leaveRef.current = onLeave;
  }, [onLeave]);

  React.useEffect(() => {
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: { resolution: VideoPresets.h360.resolution },
    });
    roomRef.current = room;
    let left = false;
    const leave = (reason: string) => {
      if (left) return;
      left = true;
      leaveRef.current(reason);
    };

    room
      .on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        const el = track.attach();
        if (track.kind === Track.Kind.Video) {
          el.className = "h-full w-full rounded-2xl object-cover";
          setRemoteVideo(true);
        }
        remoteRef.current?.appendChild(el);
      })
      .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        track.detach().forEach((el) => el.remove());
        if (track.kind === Track.Kind.Video) setRemoteVideo(false);
      })
      .on(RoomEvent.ParticipantDisconnected, () => leave("Call ended"))
      .on(RoomEvent.Disconnected, () => leave("Call ended"));

    (async () => {
      try {
        await room.connect(join.url, join.token);
        setConnected(true);
        await room.localParticipant.setMicrophoneEnabled(true);
        if (video) await room.localParticipant.setCameraEnabled(true);
      } catch (error) {
        console.error("[call] couldn't connect", error);
        const denied =
          error instanceof Error && /permission|notallowed/i.test(`${error.name} ${error.message}`);
        setProblem(
          denied
            ? "Allow the microphone (and camera) for this site in your browser settings, then call again."
            : "Couldn't connect the call. Check your internet and try again.",
        );
      }
    })();

    return () => {
      left = true;
      void room.disconnect();
    };
  }, [join.url, join.token, video]);

  // Show my own camera in the corner.
  React.useEffect(() => {
    const room = roomRef.current;
    const el = selfRef.current;
    if (!room || !el || !camOn || !connected) return;
    const track = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track;
    track?.attach(el);
    return () => {
      track?.detach(el);
    };
  }, [camOn, connected]);

  const toggleMic = async () => {
    const next = !micOn;
    await roomRef.current?.localParticipant.setMicrophoneEnabled(next);
    setMicOn(next);
  };
  const toggleCam = async () => {
    const next = !camOn;
    try {
      await roomRef.current?.localParticipant.setCameraEnabled(next);
      setCamOn(next);
    } catch (error) {
      console.error("[call] camera", error);
      setProblem("Couldn't turn on the camera. Allow it in your browser settings.");
    }
  };

  return (
    <div className="flex w-full max-w-md flex-1 flex-col items-center gap-4">
      <div
        ref={remoteRef}
        className={cn(
          "relative w-full flex-1 overflow-hidden rounded-2xl",
          remoteVideo ? "bg-black" : "hidden",
        )}
      />
      {camOn ? (
        <video
          ref={selfRef}
          muted
          playsInline
          className="absolute right-4 bottom-36 h-36 w-24 rounded-xl border-2 border-background object-cover"
        />
      ) : null}
      <p className="text-lg tabular-nums" aria-live="polite">
        {problem ?? (connected ? timer : "Connecting…")}
      </p>
      <div className="mt-auto flex items-center gap-6">
        <Button
          size="icon"
          variant="secondary"
          className="size-14 rounded-full [&_svg]:size-6"
          aria-label={micOn ? "Mute" : "Unmute"}
          aria-pressed={!micOn}
          onClick={toggleMic}
          disabled={!connected}
        >
          {micOn ? <Mic /> : <MicOff />}
        </Button>
        <Button
          size="icon"
          className="size-16 rounded-full bg-destructive hover:bg-destructive/90 [&_svg]:size-7"
          aria-label="Hang up"
          onClick={() => onLeave("Call ended")}
        >
          <PhoneOff />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="size-14 rounded-full [&_svg]:size-6"
          aria-label={camOn ? "Turn camera off" : "Turn camera on"}
          aria-pressed={camOn}
          onClick={toggleCam}
          disabled={!connected}
        >
          {camOn ? <Video /> : <VideoOff />}
        </Button>
      </div>
    </div>
  );
}
