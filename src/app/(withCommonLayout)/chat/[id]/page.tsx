/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import ChatWindow, { Message } from "@/app/(withCommonLayout)/chat/ChatWindow";
import Button from "@/components/common/Button";
import { AiOutlinePaperClip } from "react-icons/ai";
import { BiSearch } from "react-icons/bi";
import { FaRegSmile } from "react-icons/fa";
import { FiSend } from "react-icons/fi";
import { HiOutlineDotsVertical } from "react-icons/hi";
import Link from "next/link";
import ProjectModal from "@/components/common/modal/ProjectModal";
import { MdOutlineKeyboardVoice } from "react-icons/md";
import EmojiPicker from "emoji-picker-react";
import { IoMdMenu } from "react-icons/io";
import { Video, FileText, Images } from "lucide-react";
import io, { Socket } from "socket.io-client";
import demoimg from "@/assets/images/demoimg.png";
import AllUsers from "@/app/(withCommonLayout)/chat/AllUsers";
import useDecodedToken from "@/components/common/DecodeToken";
import OffersModal from "@/components/common/modal/OffersModal";
import { toast } from "sonner";
import { useParams, useRouter } from "next/navigation";
import {
  useGetConversationQuery,
  useGetMessageQuery,
  useGetuserQuery,
} from "@/redux/Api/messageApi";

const Page: React.FC = () => {
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProjectModal, setProjectModal] = useState(false);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [fileBtn, showFileBtn] = useState(false);
  const token = useDecodedToken();
  const [inbox, setInbox] = useState<Message[]>([]);
  const [messages, setMessages] = useState<string>("");
  const [socket, setSocket] = useState<any>(null);
  const user1 = token?.id;

  const [profileUrl, setProfileUrl] = useState<string>(demoimg.src);
  const id = useParams();
  const { data: getToUser } = useGetuserQuery(id.id);
  console.log(id.id, "check id");

  const user2 = useMemo(() => {
    return (
      getToUser?.data?.client?.email ||
      getToUser?.data?.retireProfessional?.email
    );
  }, [getToUser]);

  const {
    data: oldMessages,
    refetch,
    isFetching,
  } = useGetMessageQuery({ user1, user2: id.id }, { skip: !id.id });

  // console.log(oldMessages, "check old messages");
  // console.log(oldSingleMessages, "check old single messages");
  const { data: getConversation } = useGetConversationQuery(undefined, {
    skip: !id.id,
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const [users, setUsers] = useState<any[]>(getConversation?.data || []);
  const [offerNotification, setOfferNotification] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const [isSocketReady, setIsSocketReady] = useState(false);
  // const [messageNotifications, setmessageNotifications] = useState(0);

  // const [offerNotification, setOfferNotification] = useState(0);

  // console.log('My Receive Mail is:', getConversation)
  const [isLoading, setIsLoading] = useState(true);

  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  // console.log(selectedImages);
  const [selectedBase64Images, setSelectedBase64Images] = useState<string[]>(
    []
  );
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => {
    if (id) {
      refetch();
    }
  }, [id, refetch]);
  useEffect(() => {
    if (!token?.email) return;

    if (!socketRef.current) {
      const mysocket = io("ws://localhost:5001");
      socketRef.current = mysocket;

      mysocket.on("connect", () => {
        console.log("Connected to socket.io.");
        setIsSocketReady(true);
        mysocket.emit("register", JSON.stringify({ email: token?.email }));

        // Emit userInChat event when connected
        if (getToUser?.data) {
          const chattingWith =
            getToUser?.data?.[
              getToUser?.data?.retireProfessional
                ? "retireProfessional"
                : "client"
            ]?.email;

          // console.log("Sending userInChat event on connect:", {
          //   userEmail: token?.email,
          //   chattingWith,
          // });

          mysocket.emit(
            "userInChat",
            JSON.stringify({ userEmail: token?.email, chattingWith })
          );
        }
      });

      mysocket.on("conversation-list", (data) => {
        // console.log("Received conversation list:", data);
        console.log(data, "check data from useeffet convirsation list");

        setUsers(data);
        setIsLoading(false);
      });

      mysocket.on("privateMessage", (data) => {
        // console.log("Received private message:", data);
        const { message, fromEmail } = data;
        if (
          message &&
          getToUser?.data?.[
            getToUser?.data?.retireProfessional
              ? "retireProfessional"
              : "client"
          ]?.email === fromEmail
        ) {
          setInbox((prevInbox) => [...prevInbox, message]);
        }
      });

      mysocket.on("createZoomMeeting", (data) => {
        // console.log("Received Zoom meeting data:", data);
        const { savedMessage } = data;
        if (savedMessage?.meetingLink) {
          window.open(savedMessage.meetingLink, "_blank");
          setInbox((prevInbox) => [...prevInbox, savedMessage]);
        } else {
          toast.error("Invalid Zoom meeting data received.");
        }
      });

      mysocket.on("zoomMeetingError", (err) => {
        console.log("Zoom meeting error:", err);
        toast.error("Failed to create Zoom meeting. Please try again.");
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off("connect");
        socketRef.current.off("conversation-list");
        socketRef.current.off("privateMessage");
        socketRef.current.off("createZoomMeeting");
        socketRef.current.off("zoomMeetingError");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [token?.email, getToUser]);

  useEffect(() => {
    if (oldMessages?.data?.messages) {
      setInbox(oldMessages?.data?.messages);
    }
  }, [oldMessages, id.id]);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSidebar]);

  const handleshowMessage = (user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    profileUrl: string | null;
  }) => {
    if (!isSocketReady) {
      console.warn("Socket is still connecting...");
      return;
    }
    const { id, profileUrl, email } = user;
    const updatedUsers = users.map((u: any) =>
      u.id === id ? { ...u, unseenMessageCount: 0 } : u
    );
    console.log(updatedUsers, "check updatedusers");
    setUsers(updatedUsers);
    router.push(`/chat/${id}`);
    // refetch();

    if (socketRef.current) {
      console.log("Sending userInChat event with:", {
        userEmail: token?.email,
        chattingWith: email,
      });

      socketRef.current.emit(
        "userInChat",
        JSON.stringify({ userEmail: token?.email, chattingWith: email })
      );
    } else {
      console.error("Socket is not initialized.");
    }

    setProfileUrl(profileUrl || demoimg.src);
    setInbox(oldMessages?.data?.messages);
  };
  const onSendMessage = (e: any) => {
    e.preventDefault();
    if (!messages.trim() && selectedBase64Images.length === 0) {
      alert("Please enter a message or select an image.");
      return;
    }

    if (!socketRef.current) {
      toast.error("Socket connection not established.");
      return;
    }

    if (messages.trim()) {
      const message: any = {
        toEmail: user2,
        message: messages.trim() || null,
        fromEmail: token?.email,
        media: selectedBase64Images,
      };

      socketRef.current.emit("privateMessage", JSON.stringify(message));

      const temporaryMessage: any = {
        id: Date.now(), // Ensure a unique ID for temporary messages
        message: messages.trim() || null,
        meetingLink: "",
        sender: { _id: token?.id },
        recipient: { _id: id.id },
        createdAt: new Date().toISOString(),
      };

      setInbox((prevInbox) => [...prevInbox, temporaryMessage]);
      console.log(inbox, "check messages from send message handler");

      let currentUser = users.find((user) => user.email === user2);

      if (!currentUser) {
        currentUser = {
          email: getToUser?.data?.retireProfessional
            ? getToUser?.data?.retireProfessional?.email
            : getToUser?.data?.client?.email,
          name: `${
            getToUser?.data?.retireProfessional
              ? getToUser.data.retireProfessional.name.firstName
              : getToUser?.data?.client?.name.firstName
          } ${
            getToUser?.data?.retireProfessional
              ? getToUser.data.retireProfessional.name.lastName
              : getToUser?.data?.client?.name.lastName
          }`,
          profileUrl: getToUser?.data?.retireProfessional
            ? getToUser?.data?.retireProfessional?.profileUrl
            : getToUser?.data?.client?.profileUrl,
        };
      }

      currentUser.lastMessage = messages.trim();
      currentUser.lastMessageTimestamp = new Date().toISOString();

      // setUsers([currentUser, ...users.filter((user) => user.email !== user2)]);

      setMessages("");
      setSelectedImages([]);
      setSelectedBase64Images([]);
    }
  };
  const handleCreateZoomMeeting = () => {
    if (!socketRef.current) {
      toast.error("Socket connection not established.");
      return;
    }

    const callInfo = {
      fromEmail: token?.email,
      toEmail: user2,
    };

    socketRef.current.emit("createZoomMeeting", JSON.stringify(callInfo));
    console.log(callInfo, "check zoom link");
  };
  const handleFileClick = (type: string) => {
    const input = document.getElementById("fileInput") as HTMLInputElement;

    if (type === "image") {
      input.accept = "image/*"; // Accept images only
    } else if (type === "document") {
      input.accept =
        "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"; // Accept documents
    }

    // Trigger the click event for the file input
    input.click();
  };

  const handleClick = () => {
    setTimeout(() => {
      showFileBtn((prev) => !prev);
    }, 200);
  };

  const handleEmojiClick = (emojiObject: any) => {
    setMessages((prevMessages) => prevMessages + emojiObject.emoji);
  };
  const toggleEmojiPicker = () => {
    setShowEmojiPicker((prev) => !prev);
  };
  const handleOpenModal = () => {
    setIsModalOpen((e) => !e);
  };

  const handleProjectModal = () => {
    if (isButtonDisabled) return;
    setIsButtonDisabled(true);
    setProjectModal((prevState) => !prevState);
    setTimeout(() => {
      setIsButtonDisabled(false);
    });
  };

  // const handleshowMessage = (user: {
  //   id: string;
  //   email: string;
  //   firstName: string;
  //   lastName: string;
  //   profileUrl: string | null;
  // }) => {
  //   refetch();
  //   const { id, profileUrl } = user;

  //   router.push(`/chat/${id}`);

  //   socket.emit(
  //     "userInChat",
  //     JSON.stringify({ userEmail: token?.email, chattingWith: user2 })
  //   );
  //   // console.log("handle show message");

  //   setProfileUrl(profileUrl || demoimg.src);

  //   setInbox(oldMessages?.data?.messages);
  //   // console.log(filteredMessages, "chekc message list")
  // };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validImages = files.filter((file) => file.type.startsWith("image/"));

    // Alert for invalid files
    if (validImages.length !== files.length) {
      alert("Please select only valid image files.");
      return;
    }

    // Convert files to base64 and store them
    const base64Images = await Promise.all(
      validImages.map((file) => convertFileToBase64(file))
    );

    setSelectedImages((prevImages) => [...prevImages, ...validImages]);
    setSelectedBase64Images((prevImages) => [...prevImages, ...base64Images]);
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleFileRemove = (base64: string) => {
    const indexToRemove = selectedBase64Images.indexOf(base64);
    if (indexToRemove > -1) {
      setSelectedBase64Images((prevImages) =>
        prevImages.filter((_, index) => index !== indexToRemove)
      );
      setSelectedImages((prevFiles) =>
        prevFiles.filter((_, index) => index !== indexToRemove)
      );
    }
  };

  // const onSendMessage = (e: any) => {
  //   e.preventDefault();
  //   if (!messages.trim() && selectedBase64Images.length === 0) {
  //     alert("Please enter a message or select an image.");
  //     return;
  //   }
  //   if (messages.trim()) {
  //     const message: any = {
  //       toEmail: user2,
  //       message: messages.trim() || null,
  //       fromEmail: token?.email,
  //       media: selectedBase64Images,
  //     };
  //     socket.emit("privateMessage", JSON.stringify(message));

  //     const temporaryMessage: any = {
  //       id: 1,
  //       message: messages.trim() || null,
  //       meetingLink: "",
  //       sender: {
  //         email: token?.email,
  //       },
  //       recipient: {
  //         email: user2,
  //       },
  //       createdAt: Date.now(),
  //     };

  //     setInbox((prevInbox) => [...prevInbox, temporaryMessage]);

  //     let currentUser = users.find((user) => {
  //       return user.email === user2;
  //     });

  //     if (!currentUser) {
  //       currentUser = {
  //         email: getToUser?.data?.retireProfessional
  //           ? getToUser?.data?.retireProfessional?.email
  //           : getToUser?.data?.client?.email,
  //         name: `${
  //           getToUser?.data?.retireProfessional
  //             ? getToUser.data.retireProfessional.name.firstName
  //             : getToUser?.data?.client?.name.firstName
  //         }
  //         ${
  //           getToUser?.data?.retireProfessional
  //             ? getToUser.data.retireProfessional.name.lastName
  //             : getToUser?.data?.client?.name.lastName
  //         }`,
  //         profileUrl: getToUser?.data?.retireProfessional
  //           ? getToUser?.data?.retireProfessional?.profileUrl
  //           : getToUser?.data?.client?.profileUrl,
  //       };
  //     }
  //     currentUser.lastMessage = messages.trim();
  //     currentUser.lastMessageTimestamp = new Date().toISOString();
  //     const activeUser = users.filter((user) => {
  //       return user.email !== user2;
  //     });
  //     setUsers([currentUser, ...activeUser]);

  //     setMessages("");
  //     setSelectedImages([]);
  //     setSelectedBase64Images([]);
  //   }
  // };

  // const handleCreateZoomMeeting = () => {
  //   if (socket) {
  //     const callInfo = {
  //       fromEmail: token?.email,
  //       toEmail: user2,
  //     };

  //     socket.emit("createZoomMeeting", JSON.stringify(callInfo));
  //     console.log(callInfo, "check zoom link");
  //     // setInbox((prevInbox)=>[...prevInbox])
  //   } else {
  //     toast.error("Socket connection not established.");
  //   }
  // };

  const handleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  const handleClickOutside = (event: any) => {
    if (showSidebar && !event.target.closest(".sidebar")) {
      setShowSidebar(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }
  return (
    <section>
      <div className="container mx-auto pt-[20px]">
        <div className="text-[16px] flex gap-2">
          <Link href={"/"} className="text-gray-700">
            Home -{" "}
          </Link>
          <Link href={"/chat"} className="font-semibold">
            Chat
          </Link>
        </div>
        <button
          onClick={handleSidebar}
          className="bg-bg_primary rounded-[10px] p-4 flex items-center justify-center lg:hidden"
        >
          <IoMdMenu className="text-white text-[24px]" />
        </button>

        {/* Sidebar with Overlay */}
        <div
          className={`fixed inset-0 z-50 transition-transform duration-300 lg:hidden ${
            showSidebar ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="w-2/3 h-full bg-white shadow-md sidebar relative">
            <div className="p-4">
              <div className="flex items-center border rounded-[12px] px-3 py-4">
                <BiSearch className="text-gray-500 text-lg" />
                <input
                  type="text"
                  placeholder="Search message..."
                  className="bg-transparent w-full ml-2 text-gray-700 focus:outline-none"
                />
              </div>
              <AllUsers
                handleshowMessage={handleshowMessage}
                getConversation={{ data: users }}
              />
            </div>
          </div>
        </div>

        {/* Backdrop Overlay */}
        {showSidebar && (
          <div
            className="fixed inset-0 bg-black bg-opacity-30 z-40"
            onClick={handleSidebar}
          ></div>
        )}
      </div>
      <div className="flex lg:max-w-[1320px] md:w-full  w-full inset-0 overflow-hidden h-[750px]  my-4 mx-auto shadow-sm border rounded-[15px]">
        <div
          className={`w-1/3 border-r border-gray-300 bg-white overflow-y-scroll lg:block hidden ${
            showSidebar ? "hidden" : "block"
          }`}
        >
          <div className="p-4">
            <div className="flex items-center border  rounded-[12px] px-3 py-4">
              <BiSearch className="text-gray-500 text-lg" />
              <input
                type="text"
                placeholder="Search message..."
                className="bg-transparent w-full ml-2 text-gray-700 focus:outline-none"
              />
            </div>
            <AllUsers
              handleshowMessage={handleshowMessage}
              getConversation={{ data: users }}
              // messageNotifications={messageNotifications}
            />
          </div>
        </div>

        <div className="lg:w-2/3 w-full  flex flex-col relative">
          <div className="flex items-center justify-between p-4 border-b border-gray-300 bg-white mt-3 ">
            {getToUser?.data && (
              <div className="flex items-center">
                <Image
                  src={getToUser?.data?.profileUrl || demoimg}
                  alt="Jane Cooper"
                  width={40}
                  height={40}
                  className="rounded-full"
                />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-gray-900">
                    {getToUser?.data.client?.name?.firstName ||
                      getToUser?.data?.retireProfessional?.name?.firstName}{" "}
                    {getToUser?.data.client?.name?.lastName ||
                      getToUser?.data?.retireProfessional?.name?.lastName}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Last seen: 15 hours ago | Local time: 16 Oct 2024, 3:33
                  </p>
                </div>
              </div>
            )}

            {token?.role === "retireProfessional" ? (
              <div className="flex items-center gap-6">
                <button
                  onClick={handleOpenModal}
                  className="rounded-[12px] px-6 py-4 text-[16px] font-medium text-black border transition-colors duration-200 disabled:bg-gray-300 disabled:text-gray-500"
                  disabled
                >
                  Current Offers
                </button>
                {isModalOpen && (
                  <OffersModal onClose={handleOpenModal} user1={user1} />
                )}

                <Button
                  onClick={handleProjectModal}
                  disabled={isButtonDisabled}
                >
                  Create an Offer
                </Button>
                {isProjectModal && (
                  <ProjectModal
                    onClose={handleProjectModal}
                    user1={user1}
                    user2={user2}
                  />
                )}
                <Link className="hover:bg-slate-100 hover:shadow-xl" href={"/"}>
                  <HiOutlineDotsVertical />
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <button
                  onClick={handleOpenModal}
                  className="rounded-[12px] relative px-6 py-4 text-[16px] font-medium text-black border transition-colors duration-200"
                >
                  Current Offers
                  {offerNotification > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-sm rounded-full w-3 h-3 flex items-center justify-center">
                      {offerNotification}
                    </span>
                  )}
                  {/* <span className="absolute top-0 right-0 bg-red-500 text-white text-sm rounded-full w-3 h-3 flex items-center justify-center"> {offerNotifications}</span> */}
                </button>
                {isModalOpen && (
                  <OffersModal onClose={handleOpenModal} user1={user1} />
                )}

                <button
                  onClick={handleProjectModal}
                  disabled
                  className="rounded-[12px]  px-6 py-4 text-[16px] disabled:bg-gray-300 disabled:text-gray-500 font-medium text-white hover:bg-[#4629af] transition-all   duration-200"
                >
                  Create an Offer
                </button>
                {isProjectModal && (
                  <ProjectModal
                    onClose={handleProjectModal}
                    user1={user1}
                    user2={user2}
                  />
                )}
                <Link className="hover:bg-slate-100 hover:shadow-xl" href={"/"}>
                  <HiOutlineDotsVertical />
                </Link>
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="mx-auto bg-white p-4 pb-0 h-full rounded-[10px]">
              <div className="flex flex-col overflow-y-auto  h-full">
                {isFetching ? (
                  <div>loading....................</div>
                ) : (
                  <ChatWindow
                    handleOpenModal={handleOpenModal}
                    messages={inbox}
                    currentUser={user1 ?? ""}
                    profileUrl={profileUrl}
                    colorScheme={{
                      senderBg: "bg-[#F2FAFF] text-[#4A4C56]",
                      receiverBg: "bg-[#F8F8F8] text-[#4A4C56]",
                    }}
                    senderName={""}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="px-4 absolute bottom-0 left-0 w-full border-t border-gray-300 bg-white flex items-center gap-2">
            <div
              className={`absolute -top-[95px] left-[35px] flex flex-col gap-y-3 transition-all duration-500 ease-in-out ${
                fileBtn
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-5 pointer-events-none"
              }`}
            >
              <button
                onClick={() => handleFileClick("document")}
                className="bg-primary rounded-full"
              >
                <FileText className="text-lg text-white cursor-pointer flex items-center justify-center w-10 h-10 p-2" />
              </button>
              <button
                onClick={() => handleFileClick("image")}
                className="bg-primary rounded-full"
              >
                <Images className="text-lg text-white cursor-pointer flex items-center justify-center w-10 h-10 p-2" />
              </button>
            </div>

            <form
              onSubmit={onSendMessage}
              className="flex items-center gap-2 p-4 w-full"
              encType="multipart/form-data"
            >
              <AiOutlinePaperClip
                onClick={handleClick}
                className="text-xl absolute left-10 hover:bg-white rounded-full text-[#25314C] transition-all cursor-pointer w-8 h-8 p-1"
              />
              {selectedBase64Images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedBase64Images.map((base64, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-gray-200 px-3 py-2 rounded-lg"
                    >
                      <Image
                        width={90}
                        height={40}
                        src={base64}
                        alt="Selected"
                        className="w-[90px] h-10 object-cover rounded"
                      />
                      <button
                        type="button"
                        onClick={() => handleFileRemove(base64)}
                        className="text-red-500 font-bold"
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input
                id="fileInput"
                type="file"
                multiple // Allow multiple files selection
                style={{ display: "none" }} // Hide the input element
                onChange={handleImageChange}
              />
              <input
                placeholder="Write message here..."
                value={messages} // Use 'messages' state here
                onChange={(e) => setMessages(e.target.value)} // Update state correctly on change
                className="flex-1 w-full bg-gray-100 pl-12 py-2 rounded-[20px] text-gray-700 focus:outline-none max-h-[50px] resize-none"
              />
              <button type="submit" className="bg-primary rounded-full">
                <FiSend className="text-lg text-white cursor-pointer w-8 h-8 p-2" />
              </button>
            </form>

            <FaRegSmile
              onClick={toggleEmojiPicker}
              className="text-xl hover:shadow-md bg-[#F2FAFF] rounded-full text-[#25314C] cursor-pointer w-8 h-8 p-1"
            />
            {showEmojiPicker && (
              <div ref={emojiPickerRef} className="absolute bottom-16 right-0">
                <EmojiPicker onEmojiClick={handleEmojiClick} />
              </div>
            )}
            <MdOutlineKeyboardVoice className="text-xl hover:shadow-md  bg-[#F2FAFF] rounded-full text-[#25314C] cursor-pointer w-8 h-8 p-1" />
            <button
              onClick={handleCreateZoomMeeting}
              className="text-xl hover:shadow-md bg-[#F2FAFF] rounded-full text-[#25314C] cursor-pointer w-8 h-8 p-1"
            >
              <Video />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Page;
