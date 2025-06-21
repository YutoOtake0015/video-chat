const socket = io("/");
const myPeer = new Peer();
const videoWrap = document.getElementById("video-wrap");
const myVideo = document.createElement("video");
myVideo.muted = true;

const peer = {};
let myVideoStream;
const addVideoStream = (video, stream) => {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  videoWrap.append(video);
};

const connectToNewUser = (userId, stream) => {
  const call = myPeer.call(userId, stream);
  const video = document.createElement("video");

  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream);
  });

  call.on("close", () => {
    video.remove();
  });

  peer[userId] = call;
};

navigator.mediaDevices
  .getUserMedia({
    video: true,
    audio: true,
  })
  .then((stream) => {
    myVideoStream = stream;
    addVideoStream(myVideo, stream);

    myPeer.on("call", (call) => {
      call.answer(stream);
      const video = document.createElement("video");
      call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream);
      });
    });

    socket.on("user-connected", (userId) => {
      connectToNewUser(userId, stream);
    });
  });

socket.on("user-disconnected", (userId) => {
  console.log("user disconnected", userId);
  if (peer[userId]) peer[userId].close();
});

myPeer.on("open", (userId) => {
  socket.emit("join-room", ROOM_ID, userId);
});

myPeer.on("disconnect", (id) => {
  console.log("disconnected from peer server", id);
});

const muteUnmute = (e) => {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;

  if (enabled) {
    e.classList.add("active");
    myVideoStream.getAudioTracks()[0].enabled = false;
  } else {
    e.classList.remove("active");
    myVideoStream.getAudioTracks()[0].enabled = true;
  }
};

const playStop = (e) => {
  const enabled = myVideoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    e.classList.add("active");
    myVideoStream.getVideoTracks()[0].enabled = false;
  } else {
    e.classList.remove("active");
    myVideoStream.getVideoTracks()[0].enabled = true;
  }
};

const leaveVideo = (e) => {
  socket.disconnect();
  myPeer.disconnect();

  const videos = document.getElementsByTagName("video");
  for (let i = 0; i < videos.length; --i) {
    videos[i].remove();
  }
};
