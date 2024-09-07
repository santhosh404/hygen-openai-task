import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef, useState } from 'react';
import OpenAI from 'openai';
import { Configuration, NewSessionData, StreamingAvatarApi } from '@heygen/streaming-avatar';
import { getAccessToken } from './services/api';
import { Video } from './components/reusable/Video';
import ChatMessage from './components/reusable/ChatMessage';
import MicButton from './components/reusable/MicButton';
import { LandingComponent } from './components/reusable/LandingComponent';
import ScrollableFeed from 'react-scrollable-feed';
import { Badges } from './components/reusable/Badges';
import { Toaster } from "@/components/ui/toaster"

type ChatMessageType = {
  role: string;
  message: string;
};

function App() {
  //Toast
  const { toast } = useToast()

  const [isBegin, setIsBegin] = useState<boolean>(false);
  const [startLoading, setStartLoading] = useState<boolean>(false);
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [input, setInput] = useState<string>('');
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const [stream, setStream] = useState<MediaStream>();
  const [data, setData] = useState<NewSessionData>();
  const mediaStream = useRef<HTMLVideoElement>(null);
  const avatar = useRef<StreamingAvatarApi | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessageType[]>([
    // {
    //   role: 'user',
    //   message: 'hi, how are you!'
    // },
    // {
    //   role: 'assistant',
    //   message: 'I am fine, Thank you for asking. How about you!'
    // },
    // {
    //   role: 'user',
    //   message: 'Explain me about python!'
    // },
    // {
    //   role: 'assistant',
    //   message: "Python is an interpreted, object-oriented, high-level programming language with dynamic semantics. Its high-level built in data structures, combined with dynamic typing and dynamic binding, make it very attractive for Rapid Application Development, as well as for use as a scripting or glue language to connect existing components together. Python's simple, easy to learn syntax emphasizes readability and therefore reduces the cost of program maintenance. Python supports modules and packages, which encourages program modularity and code reuse. The Python interpreter and the extensive standard library are available in source or binary form without charge for all major platforms, and can be freely distributed."
    // },
    // {
    //   role: 'user',
    //   message: 'hi, how are you!'
    // },


  ]);

  const apiKey: any = import.meta.env.VITE_OPENAI_API_KEY;
  const openai = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true,
  });

  const handleStartSpeaking = () => {

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        const audioContext = new (window.AudioContext)();
        const mediaStreamSource = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        const bufferLength = analyser.fftSize;
        const dataArray = new Uint8Array(bufferLength);

        mediaStreamSource.connect(analyser);

        let silenceStart: number | null = null;
        const silenceTimeout = 1000; // 1 second of silence
        let silenceDetected = false;
        mediaRecorder.current = new MediaRecorder(stream);

        mediaRecorder.current.ondataavailable = (event) => {
          audioChunks.current.push(event.data);
        };

        mediaRecorder.current.onstop = () => {
          const audioBlob = new Blob(audioChunks.current, {
            type: 'audio/wav',
          });
          audioChunks.current = [];
          transcribeAudio(audioBlob);
        };

        mediaRecorder.current.start();
        setIsSpeaking(true);


        const checkSilence = () => {
          analyser.getByteFrequencyData(dataArray);
          const avgVolume = dataArray.reduce((a, b) => a + b) / bufferLength;

          // Adjust the silence threshold based on the environment
          const silenceThreshold = 10;

          if (avgVolume < silenceThreshold) {
            if (!silenceStart) silenceStart = Date.now();

            if (Date.now() - silenceStart >= silenceTimeout && !silenceDetected) {
              silenceDetected = true;
              handleStopSpeaking(); // Stop the mediaRecorder after 1 second of silence
              audioContext.close(); // Close the audio context
              stream.getTracks().forEach(track => track.stop()); // Stop the stream
            }
          } else {
            silenceStart = null;
          }

          if (!silenceDetected) requestAnimationFrame(checkSilence);
        };

        checkSilence();
      })
      .catch((error) => {
        console.error('Error accessing microphone:', error);
        toast({
          variant: "destructive",
          title: "Uh oh! Something went wrong.",
          description: error.message,
        })
      });
  };

  const handleStopSpeaking = async () => {
    if (mediaRecorder.current) {
      mediaRecorder.current.stop();
      setIsSpeaking(false);
    }
  };

  async function transcribeAudio(audioBlob: Blob) {
    try {
      // Convert Blob to File
      const audioFile = new File([audioBlob], 'recording.wav', {
        type: 'audio/wav',
      });

      const response = await openai.audio.transcriptions.create({
        model: 'whisper-1',
        file: audioFile,
      });

      const transcription = response.text;
      setChatMessages(prev => [...prev, { role: 'user', message: transcription }]);
      const aiResponse = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: transcription }
        ]
      });
      setInput(aiResponse.choices[0].message.content || '');
      setChatMessages(prev => [...prev, { role: 'assistant', message: aiResponse.choices[0].message.content || '' }]);
    } catch (error: any) {
      console.error('Error transcribing audio:', error);
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: error.message,
      })
    }
  }

  useEffect(() => {
    async function speak() {
      try {
        await avatar.current?.speak({ taskRequest: { text: input, sessionId: data?.sessionId } });
      } catch (err: any) {
        console.error(err);
      }
    }

    speak();
    // handleStartSpeaking();
  }, [input]);

  useEffect(() => {
    async function fetchAccessToken() {
      try {
        const response = await getAccessToken();
        const token = response.data.data.token;


        if (!avatar.current) {
          avatar.current = new StreamingAvatarApi(
            new Configuration({ accessToken: token })
          );
        }
        avatar.current.addEventHandler("avatar_stop_talking", (e: any) => {
          console.log("Avatar stopped talking", e);
          // handleStartSpeaking();
        });

      } catch (error: any) {
        console.error("Error fetching access token:", error);
        toast({
          variant: "destructive",
          title: "Uh oh! Something went wrong.",
          description: error.response.data.message || error.message,
        })
      }
    }

    fetchAccessToken();

    return () => {
      if (avatar.current) {
        avatar.current.removeEventHandler("avatar_stop_talking", (e: any) => {
          console.log("Avatar stopped talking", e);
          handleStartSpeaking();
        });
      }
    }
  }, []);

  async function grab() {
    setStartLoading(true);
    try {
      const res = await avatar.current!.createStartAvatar(
        {
          newSessionRequest: {
            quality: "low",
            avatarName: import.meta.env.VITE_HEYGEN_AVATARID,
            voice: { voiceId: import.meta.env.VITE_HEYGEN_VOICEID }
          }
        },
      );
      setData(res);
      setStream(avatar.current!.mediaStream);
      setStartLoading(false);
      setIsBegin(true);

    } catch (error: any) {
      console.log(error);
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: error.message,
      })
    }
  };

  // async function stop() {
  //   await avatar.current?.stopAvatar({ stopSessionRequest: { sessionId: data?.sessionId } });
  // }

  useEffect(() => {
    if (selectedPrompt) {
      setChatMessages(prev => [...prev, { role: 'user', message: selectedPrompt }]);
      openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: selectedPrompt }
        ]
      }).then(aiResponse => {
        setChatMessages(prev => [...prev, { role: 'assistant', message: aiResponse.choices[0].message.content || '' }]);
        setInput(aiResponse.choices[0].message.content || '');
      }).catch(error => {
        console.log(error);
        toast({
          variant: "destructive",
          title: "Uh oh! Something went wrong.",
          description: error.message,
        })
      })

    }

  }, [selectedPrompt])

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream;
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current!.play();
      };
    }
  }, [stream]);

  return (
    <>
      <Toaster />
      {
        !isBegin ? (
          <div>
            <LandingComponent
              grab={grab}
              startLoading={startLoading}
            />

          </div>

        ) : (
          <div className="flex flex-col items-center justify-center p-4 max-w-[1200px] mx-auto">
            {/* {audioSrc && (
              <audio controls>
                <source src={audioSrc} type="audio/wav" />
                Your browser does not support the audio element.
              </audio>
            )} */}
            <div className='adjustableHeight'>
              <Video ref={mediaStream} />
              {
                chatMessages.length > 0 && (
                  <ScrollableFeed>
                    <div className="flex-1 p-4 overflow-y-auto  w-[100%] bg-gray-50 rounded-3xl my-5 h-[400px]">
                      {
                        chatMessages.map((chatMsg, index) => (
                          <ChatMessage
                            key={index}
                            role={chatMsg.role}
                            message={chatMsg.message}
                          />
                        ))
                      }

                    </div>
                  </ScrollableFeed>
                )
              }
            </div>

            <div className='bg-gray-50 flex flex-col justify-center fixed bottom-0 p-2 w-full rounded-lg z-10'>

              <Badges
                setSelectedPrompt={setSelectedPrompt}
              />
              <MicButton
                isSpeaking={isSpeaking}
                onClick={isSpeaking ? handleStopSpeaking : handleStartSpeaking}
              />
            </div>
            {/* <Button onClick={stop}>Stop Avatar</Button> */}
          </div>
        )
      }


    </>

  );
}

export default App;
