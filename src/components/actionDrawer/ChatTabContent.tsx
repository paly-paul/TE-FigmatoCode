"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Users } from "lucide-react";
import { WS_BASE_URL } from "@/lib/api";
import { CusTextarea } from "@/components/forms/CusTextarea";

interface ChatMessage {
  message_content: string;
  message_type: string;
  messaged_on: string;
  content_type: "sent" | "received";
  user_name: string;
  user_type: string;
  is_flagged: number;
  messaged_by: string;
}

interface ChannelData {
  rr_name?: string;
  rr_id?: string;
  channel?: string;
  recruiter?: { recruiter_name: string; email: string }[];
  customer?: { customer_name: string; email: string }[];
  candidate_email?: string;
}

interface ChatTabContentProps {
  jobId: string;
  profileId: string;
  userEmail: string;
  userName?: string;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp + "Z");
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatDateLabel(timestamp: string): string {
  const date = new Date(timestamp + "Z");
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function getDateKey(timestamp: string): string {
  return new Date(timestamp + "Z").toDateString();
}

function getRoleBadgeStyle(role: string): string {
  switch (role.toLowerCase()) {
    case "candidate":
      return "bg-blue-50 text-blue-700 border border-blue-200";
    case "te - recruiter":
    case "recruiter":
      return "bg-purple-50 text-purple-700 border border-purple-200";
    case "customer - hr":
    case "hr manager":
    case "hr":
      return "bg-orange-50 text-orange-700 border border-orange-200";
    case "team lead":
      return "bg-green-50 text-green-700 border border-green-200";
    default:
      return "bg-gray-50 text-gray-600 border border-gray-200";
  }
}

function getAvatarGradient(role: string): string {
  switch (role.toLowerCase()) {
    case "te - recruiter":
    case "recruiter":
      return "from-purple-500 to-purple-700";
    case "customer - hr":
    case "hr manager":
    case "hr":
      return "from-orange-400 to-orange-600";
    case "team lead":
      return "from-green-500 to-green-700";
    default:
      return "from-[#1447E6] to-[#3B82F6]";
  }
}

function getMessageBubbleStyle(is_flagged: number, contentType: string, role: string): string {
  if (is_flagged === 1)
    return "bg-amber-50 border border-amber-200 text-amber-900 italic";
  if (contentType === "sent")
    return "bg-[#EBF1FF] border border-[#C7D7F7] text-[#202939]";
  switch (role.toLowerCase()) {
    case "te - recruiter":
    case "recruiter":
      return "bg-white border border-[#E9D8FD] text-[#202939]";
    case "customer - hr":
    case "hr manager":
    case "hr":
      return "bg-white border border-[#FED7AA] text-[#202939]";
    case "team lead":
      return "bg-white border border-[#BBF7D0] text-[#202939]";
    default:
      return "bg-white border border-[#E6ECF6] text-[#202939]";
  }
}

function MessageContent({ text }: { text: string }) {
  const parts = text.split(/(@\w+)/);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <span key={i} className="font-semibold text-[#1447E6] bg-[#EBF1FF] px-1 py-0.5 rounded text-[11px]">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export function ChatTabContent({ jobId, profileId, userEmail, userName }: ChatTabContentProps) {
  const [channel, setChannel] = useState<string | null>(null);
  const [channelData, setChannelData] = useState<ChannelData | null>(null);
  const [channelLoading, setChannelLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const participantMapRef = useRef<Record<string, { user_name: string; user_type: string }>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Find the channel for this job
  useEffect(() => {
    if (!profileId || !jobId) {
      setChannelLoading(false);
      return;
    }
    let cancelled = false;
    setChannelLoading(true);
    (async () => {
      try {
        const res = await fetch(
          `/api/candidate/chat/user_get?profile_name=${encodeURIComponent(profileId)}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json() as Record<string, unknown>;
        if (data?.message && (data.message as Record<string, unknown>)?.status === "success") {
          const list = (data.message as Record<string, unknown>)?.data as Array<Record<string, unknown>>;
          const match = list?.find((item) => item.rr_id === jobId);
          if (!cancelled) {
            setChannel((match?.channel as string) ?? null);
            setChannelData(match ? (match as unknown as ChannelData) : null);
          }
        }
      } catch {
        // show no-chat state
      } finally {
        if (!cancelled) setChannelLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [jobId, profileId]);

  // Fetch messages when channel is known
  useEffect(() => {
    if (!channel) return;
    let cancelled = false;
    (async () => {
      try {
        const qs = new URLSearchParams({ channel_name: channel, user: userEmail });
        const res = await fetch(`/api/candidate/chat/chat_get?${qs}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json() as Record<string, unknown>;
        const raw = (data?.message as Record<string, unknown>)?.messages;
        const currentUser = (data?.message as Record<string, unknown>)?.current_user ?? userEmail;
        const participants = (data?.message as Record<string, unknown>)?.channel_details as Record<string, unknown> | undefined;

        const pMap: Record<string, { user_name: string; user_type: string }> = {};
        for (const p of (participants?.participants as Record<string, unknown>)?.recruiters as Array<Record<string, unknown>> ?? []) {
          pMap[p.user as string] = { user_name: p.full_name as string, user_type: p.user_type as string };
        }
        for (const p of (participants?.participants as Record<string, unknown>)?.customers as Array<Record<string, unknown>> ?? []) {
          pMap[p.user as string] = { user_name: p.full_name as string, user_type: p.user_type as string };
        }
        const cand = (participants?.participants as Record<string, unknown>)?.candidate as Record<string, unknown> | undefined;
        if (cand) pMap[cand.user as string] = { user_name: cand.full_name as string, user_type: cand.user_type as string };
        participantMapRef.current = pMap;

        if (!cancelled && Array.isArray(raw)) {
          setMessages(
            raw.map((msg: Record<string, unknown>) => {
              const info = pMap[msg.messaged_by as string];
              return {
                message_content: (msg.message_content as string) ?? "",
                message_type: (msg.message_type as string) ?? "Text",
                messaged_on: (msg.messaged_on as string) ?? "",
                is_flagged: (msg.is_flagged as number) ?? 0,
                messaged_by: (msg.messaged_by as string) ?? "",
                content_type: msg.messaged_by === currentUser ? "sent" : "received",
                user_name: info?.user_name ?? (msg.user_name as string) ?? "Unknown",
                user_type: info?.user_type ?? (msg.user_type as string) ?? "user",
              };
            })
          );
        }
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [channel, userEmail]);

  // WebSocket for live messages
  useEffect(() => {
    if (!channel || !WS_BASE_URL) return;
    const wsUrl = `${WS_BASE_URL}/api/v1/events/ws/chat:${channel}`;
    const socket = new WebSocket(wsUrl);
    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as Record<string, unknown>;
        const info = participantMapRef.current[payload.messaged_by as string];
        setMessages((prev) => [
          ...prev,
          {
            message_content: (payload.message_content as string) ?? "",
            message_type: (payload.message_type as string) ?? "Text",
            messaged_on: (payload.messaged_on as string) ?? new Date().toISOString(),
            is_flagged: (payload.is_flagged as number) ?? 0,
            messaged_by: (payload.messaged_by as string) ?? "",
            content_type: payload.messaged_by === userEmail ? "sent" : "received",
            user_name: (payload.user_name as string) ?? info?.user_name ?? "Unknown",
            user_type: (payload.user_type as string) ?? info?.user_type ?? "user",
          },
        ]);
      } catch { /* ignore malformed frames */ }
    };
    return () => socket.close();
  }, [channel, userEmail]);

  // Scroll to bottom on new messages
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (isNearBottom) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 150);
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  const handleSend = async () => {
    const text = messageInput.trim();
    if (!text || !channel || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/candidate/chat/send_message", {
        method: "POST",
        body: JSON.stringify({
          channel,
          attachment: null,
          message_content: text,
          message_type: "Text",
          messaged_by: userEmail,
        }),
      });
      if (res.ok) setMessageInput("");
    } catch { /* ignore */ } finally {
      setSending(false);
    }
  };

  const recruiterEmails = channelData?.recruiter?.map((r) => r.email) ?? [];
  const customerEmails = channelData?.customer?.map((c) => c.email) ?? [];
  const emailList = [...new Set([...recruiterEmails, ...customerEmails, userEmail])];
  const sendMessageState = emailList.includes(userEmail);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (channelLoading) {
    return (
      <div className="rounded-md border border-[#E6ECF6] bg-[#F8FAFD]">
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D8E3F8] border-t-[#1447E6]" />
          <p className="text-xs text-[#5E7397]">Loading chat…</p>
        </div>
      </div>
    );
  }

  // ── No channel ───────────────────────────────────────────────────────────────
  if (!channel) {
    return (
      <div className="rounded-md border border-[#E6ECF6] bg-[#F8FAFD]">
        <div className="flex flex-col items-center justify-center py-14 px-6 text-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F0F5FF]">
            <MessageCircle className="h-7 w-7 text-[#1447E6]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#202939]">No chat available</p>
            <p className="mt-1 text-xs text-[#5E7397] max-w-[220px] mx-auto leading-relaxed">
              Chat will be enabled once a recruiter connects you to this role.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Active chat ──────────────────────────────────────────────────────────────
  const participantLine = [
    userName ? `${userName} (You)` : null,
    channelData?.recruiter?.length
      ? channelData.recruiter.map((r) => r.recruiter_name).join(", ") + " (Recruiter)"
      : null,
    channelData?.customer?.length
      ? channelData.customer.map((c) => c.customer_name).join(", ") + " (HR)"
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col rounded-md border border-[#E6ECF6] overflow-hidden" style={{ height: "460px" }}>

      {/* ── Header ── */}
      <div className="shrink-0 border-b border-[#E6ECF6] bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1447E6] to-[#3B82F6] text-sm font-bold text-white shadow-sm`}>
            {channelData?.rr_name?.charAt(0) ?? "#"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#202939]">
              {channelData?.rr_id && (
                <span className="text-[#5E7397] font-normal mr-1">{channelData.rr_id} ·</span>
              )}
              {channelData?.rr_name ?? "Chat"}
            </p>
            {participantLine && (
              <div className="flex items-center gap-1 mt-0.5">
                <Users className="h-3 w-3 shrink-0 text-[#5E7397]" />
                <p className="truncate text-[11px] text-[#5E7397]">{participantLine}</p>
              </div>
            )}
          </div>
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] font-medium text-green-600">Live</span>
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="relative flex-1 overflow-y-auto bg-[#F8FAFD] px-4 py-3 space-y-1"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F0F5FF]">
              <MessageCircle className="h-6 w-6 text-[#1447E6]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#202939]">No messages yet</p>
              <p className="mt-0.5 text-xs text-[#5E7397]">Start the conversation below.</p>
            </div>
          </div>
        ) : (
          (() => {
            const elements: React.ReactNode[] = [];
            let lastDateKey = "";

            messages.forEach((msg, i) => {
              const dateKey = msg.messaged_on ? getDateKey(msg.messaged_on) : "";
              const showDate = dateKey && dateKey !== lastDateKey;
              if (showDate) {
                lastDateKey = dateKey;
                elements.push(
                  <div key={`date-${i}`} className="flex items-center gap-3 py-2">
                    <div className="h-px flex-1 bg-[#E6ECF6]" />
                    <span className="text-[10px] font-medium text-[#5E7397] px-2">
                      {formatDateLabel(msg.messaged_on)}
                    </span>
                    <div className="h-px flex-1 bg-[#E6ECF6]" />
                  </div>
                );
              }

              const isSent = msg.content_type === "sent";
              elements.push(
                <div
                  key={i}
                  className={`flex gap-2.5 ${isSent ? "justify-end" : "justify-start"} mb-2`}
                >
                  {/* Avatar (received only) */}
                  {!isSent && (
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarGradient(msg.user_type)} text-[11px] font-bold text-white mt-0.5 shadow-sm`}
                    >
                      {msg.user_name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className={`flex flex-col ${isSent ? "items-end" : "items-start"} max-w-[75%]`}>
                    {/* Sender meta (received only) */}
                    {!isSent && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[11px] font-semibold text-[#202939]">
                          {msg.user_name}
                        </span>
                        {msg.user_type !== "AI" && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${getRoleBadgeStyle(msg.user_type)}`}>
                            {msg.user_type}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Bubble */}
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-xs ${
                        isSent ? "rounded-br-sm" : "rounded-bl-sm"
                      } ${getMessageBubbleStyle(msg.is_flagged, msg.content_type, msg.user_type)}`}
                    >
                      <MessageContent text={msg.message_content} />
                    </div>

                    {/* Timestamp */}
                    <span className="mt-1 text-[10px] text-[#9CA3AF]">
                      {msg.messaged_on ? formatTime(msg.messaged_on) : ""}
                    </span>
                  </div>
                </div>
              );
            });

            return elements;
          })()
        )}
        <div ref={messagesEndRef} />

        {/* Scroll-to-bottom button */}
        {showScrollBtn && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="sticky bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-white border border-[#E6ECF6] px-3 py-1.5 text-[11px] font-medium text-[#1447E6] shadow-sm hover:bg-[#F0F5FF] transition-colors"
          >
            <Send className="h-3 w-3 rotate-90" />
            New messages
          </button>
        )}
      </div>

      {/* ── Input ── */}
      {sendMessageState && (
        <div className="shrink-0 border-t border-[#E6ECF6] bg-white px-4 py-3">
          <form
            className="relative"
            onSubmit={(e) => { e.preventDefault(); void handleSend(); }}
          >
            <CusTextarea
              mHeight="72px"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
              disabled={sending}
              className="pr-12 text-xs"
            />
            <button
              type="submit"
              disabled={sending || !messageInput.trim()}
              className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[#1447E6] text-white shadow-sm transition-all hover:bg-[#1035c8] disabled:cursor-not-allowed disabled:opacity-40 active:scale-95"
            >
              {sending ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border border-t-transparent border-white" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </button>
          </form>
          <p className="mt-1.5 text-[10px] text-[#9CA3AF]">
            Messages are visible to all channel participants.
          </p>
        </div>
      )}
    </div>
  );
}
