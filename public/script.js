const socket = io("/");
const videoWrap = document.getElementById("video-wrap");
const myVideo = document.createElement("video");
myVideo.muted = true;

let localStream;
let remoteStream;
let peerStream;

const config = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const constraints = {
  video: true,
  audio: true,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

const addVideoStream = (video, stream) => {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  videoWrap.append(video);
};

const createPeerConnection = () => {
  peerConnection = new RTCPeerConnection(config);

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", event.candidate);
    }
  };

  peerConnection.ontrack = (event) => {
    if (!remoteStream) {
      remoteStream = new MediaStream();
      const remoteVideo = document.createElement("video");
      remoteVideo.srcObject = remoteStream;
      remoteVideo.autoplay = true;
      remoteVideo.playsInline = true;
      videoWrap.append(remoteVideo);
    }
    remoteStream.addTrack(event.track);
  };

  peerConnection.oniceconnectionstatechange = () => {
    console.log("ICE state:", peerConnection.iceConnectionState);
  };
};

// メディア取得と接続処理
navigator.mediaDevices
  .getUserMedia(constraints)
  .then((stream) => {
    localStream = stream;
    addVideoStream(myVideo, stream);

    socket.emit("join-room", ROOM_ID);

    socket.on("user-connected", () => {
      createPeerConnection();
      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });

      peerConnection
        .createOffer()
        .then((offer) => {
          return peerConnection.setLocalDescription(offer);
        })
        .then(() => {
          socket.emit("offer", peerConnection.localDescription);
        });
    });

    socket.on("offer", (offer) => {
      createPeerConnection();
      peerConnection
        .setRemoteDescription(new RTCSessionDescription(offer))
        .then(() => {
          localStream.getTracks().forEach((track) => {
            peerConnection.addTrack(track, localStream);
          });
          return peerConnection.createAnswer();
        })
        .then((answer) => {
          return peerConnection.setLocalDescription(answer);
        })
        .then(() => {
          socket.emit("answer", peerConnection.localDescription);
        });
    });

    socket.on("answer", (answer) => {
      peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("ice-candidate", (candidate) => {
      peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    });

    socket.on("user-disconnected", () => {
      console.log("Peer disconnected");

      if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
      }

      // 相手の映像だけを削除（自分の映像は muted なので残す）
      const remoteVideos = document.querySelectorAll("video");
      remoteVideos.forEach((video) => {
        if (!video.muted) video.remove();
      });

      remoteStream = null;
    });
  })
  .catch((err) => {
    console.error("Media error:", err);
  });

function toggleAudio(button) {
  if (!localStream) return;
  const audioTrack = localStream.getAudioTracks()[0];
  if (!audioTrack) return;

  audioTrack.enabled = !audioTrack.enabled;
  button.classList.toggle("active", !audioTrack.enabled);
  console.log("Audio " + (audioTrack.enabled ? "unmuted" : "muted"));
}

function toggleVideo(button) {
  if (!localStream) return;
  const videoTrack = localStream.getVideoTracks()[0];
  if (!videoTrack) return;

  videoTrack.enabled = !videoTrack.enabled;
  button.classList.toggle("active", !videoTrack.enabled);
  console.log("Video " + (videoTrack.enabled ? "enabled" : "disabled"));
}

function leaveCall(button) {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  socket.emit("manual-disconnect");

  const videos = document.querySelectorAll("video");
  videos.forEach((video) => video.remove());

  socket.disconnect();

  console.log("Call ended");
}
