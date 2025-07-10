import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Minimize2, Maximize2, User, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useChatSupport } from '@/hooks/useChatSupport';
import { cn } from '@/lib/utils';

interface ChatWidgetProps {
  userId?: string;
  className?: string;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ userId, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    isLoading,
    currentSession,
    messages,
    isConnected,
    initializeChat,
    sendMessage,
    endChat
  } = useChatSupport(userId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleStartChat = async () => {
    if (!userId && !showContactForm) {
      setShowContactForm(true);
      setIsOpen(true);
      return;
    }
    
    if (!isConnected) {
      await initializeChat(undefined, undefined, !userId ? { name: customerName, phone: customerPhone } : undefined);
    }
    setIsOpen(true);
  };

  const handleContactFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) return;
    
    setShowContactForm(false);
    await initializeChat(undefined, undefined, { name: customerName, phone: customerPhone });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isLoading) return;

    const messageToSend = newMessage;
    setNewMessage('');
    setIsTyping(false);

    await sendMessage(messageToSend);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    setIsTyping(e.target.value.length > 0);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getSenderDisplay = (message: any) => {
    switch (message.sender_type) {
      case 'user':
        return 'You';
      case 'agent':
        return 'Support Agent';
      case 'ai':
        return 'AI Assistant';
      case 'system':
        return 'System';
      default:
        return 'Unknown';
    }
  };

  if (!isOpen) {
    return (
      <div className={cn("fixed bottom-4 right-4 z-50", className)}>
        <Button
          onClick={handleStartChat}
          size="lg"
          className="rounded-full h-14 w-14 bg-primary hover:bg-primary/90 shadow-lg"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
        <div className="absolute -top-12 right-0 bg-black text-white text-xs px-2 py-1 rounded opacity-75">
          Chat with us
        </div>
      </div>
    );
  }

  return (
    <div className={cn("fixed bottom-4 right-4 z-50", className)}>
      <Card className={cn(
        "w-80 h-96 shadow-xl transition-all duration-200",
        isMinimized && "h-14"
      )}>
        <CardHeader className="flex flex-row items-center justify-between py-3 px-4 bg-primary text-primary-foreground">
          <CardTitle className="text-sm font-medium">
            {isConnected ? 'Live Support' : 'Start Chat'}
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-6 w-6 p-0 hover:bg-primary-foreground/20"
            >
              {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0 hover:bg-primary-foreground/20"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-0 flex flex-col h-80">
            {!isConnected ? (
              <div className="flex-1 flex items-center justify-center p-4">
                {showContactForm && !userId ? (
                  <div className="w-full space-y-4">
                    <div className="text-center">
                      <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="font-medium mb-2">Let's get started</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Please provide your details to begin the chat
                      </p>
                    </div>
                    <form onSubmit={handleContactFormSubmit} className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="customer-name" className="text-sm font-medium">
                          Your Name
                        </Label>
                        <Input
                          id="customer-name"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Enter your full name"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customer-phone" className="text-sm font-medium">
                          Phone Number
                        </Label>
                        <Input
                          id="customer-phone"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="Enter your phone number"
                          type="tel"
                          required
                        />
                      </div>
                      <div className="space-y-3 pt-4">
                        <Button 
                          onClick={(e) => {
                            e.preventDefault();
                            if (!customerName.trim() || !customerPhone.trim()) {
                              // Add visual feedback for empty fields
                              const nameInput = document.getElementById('customer-name');
                              const phoneInput = document.getElementById('customer-phone');
                              if (!customerName.trim() && nameInput) {
                                nameInput.focus();
                                nameInput.classList.add('border-red-500');
                                setTimeout(() => nameInput.classList.remove('border-red-500'), 2000);
                              } else if (!customerPhone.trim() && phoneInput) {
                                phoneInput.focus();
                                phoneInput.classList.add('border-red-500');
                                setTimeout(() => phoneInput.classList.remove('border-red-500'), 2000);
                              }
                              return;
                            }
                            handleContactFormSubmit(e);
                          }}
                          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          ⭐ {isLoading ? 'Starting...' : 'Start Chat'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowContactForm(false);
                            setIsOpen(false);
                          }}
                          className="w-full"
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="text-center">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="font-medium mb-2">Start a conversation</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Get instant help from our support team
                    </p>
                    <Button 
                      onClick={handleStartChat} 
                      disabled={isLoading}
                      className="w-full"
                    >
                      {isLoading ? 'Connecting...' : 'Start Chat'}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="flex-1 min-h-0">
                  <ScrollArea className="h-full p-4">
                    <div className="space-y-3">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={cn(
                            "flex flex-col gap-1 max-w-[85%]",
                            message.sender_type === 'user' ? 'ml-auto' : 'mr-auto'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {getSenderDisplay(message)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(message.created_at)}
                            </span>
                            {message.sender_type === 'ai' && (
                              <Badge variant="secondary" className="text-xs">AI</Badge>
                            )}
                          </div>
                          <div
                            className={cn(
                              "p-3 rounded-lg text-sm",
                              message.sender_type === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : message.sender_type === 'system'
                                ? 'bg-muted text-muted-foreground text-center italic'
                                : 'bg-muted'
                            )}
                          >
                            {message.content}
                          </div>
                        </div>
                      ))}
                      {isTyping && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-xs">AI is typing...</span>
                        </div>
                      )}
                    </div>
                    <div ref={messagesEndRef} />
                  </ScrollArea>
                </div>

                <div className="p-4 border-t">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={handleInputChange}
                      placeholder="Type your message..."
                      disabled={isLoading}
                      className="flex-1"
                    />
                    <Button 
                      type="submit" 
                      size="sm" 
                      disabled={!newMessage.trim() || isLoading}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-muted-foreground">
                      {isConnected && currentSession?.agent_id ? 'Agent assigned' : 'AI assistance'}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={endChat}
                      className="text-xs h-auto p-1"
                    >
                      End Chat
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
};