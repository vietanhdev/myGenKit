import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalFooter,
  Button,
  Input,
  Card,
  CardBody,
  Tabs,
  Tab,
  Divider,
  Avatar,
  Chip
} from '@heroui/react';
import { User } from '../../lib/user-management';

interface LoginFormProps {
  isOpen: boolean;
  onLogin: (username: string, password: string) => Promise<boolean>;
  onRegister: (username: string, password: string) => Promise<boolean>;
  existingUsers: User[];
  isLoading?: boolean;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  isOpen,
  onLogin,
  onRegister,
  existingUsers,
  isLoading = false
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setUsername('');
      setPassword('');
      setConfirmPassword('');
      setError('');
      setIsSubmitting(false);
      
      // Default to login if users exist, register if no users
      setActiveTab(existingUsers.length > 0 ? 'login' : 'register');
    }
  }, [isOpen, existingUsers.length]);

  const handleSubmit = async () => {
    setError('');
    
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    
    if (!password.trim()) {
      setError('Password is required');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    if (activeTab === 'register' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      let success = false;
      
      if (activeTab === 'login') {
        success = await onLogin(username.trim(), password);
        if (!success) {
          setError('Invalid username or password');
        }
      } else {
        success = await onRegister(username.trim(), password);
        if (!success) {
          setError('Failed to create account. Username might already exist.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUserClick = (user: User) => {
    setUsername(user.username);
    setActiveTab('login');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSubmitting) {
      handleSubmit();
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={() => {}} // Prevent closing
      size="md"
      backdrop="opaque"
      isDismissable={false}
      hideCloseButton
      classNames={{
        backdrop: "bg-gradient-to-t from-zinc-900 to-zinc-900/10 backdrop-opacity-20"
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img 
              src="/logo.svg" 
              alt="myGenKit Logo" 
              className="w-8 h-8 shrink-0"
              onError={(e) => {
                // Fallback to PNG if SVG fails to load
                e.currentTarget.src = "/logo.png";
              }}
            />
            <h2 className="text-xl font-bold">myGenKit</h2>
          </div>
          <p className="text-sm text-default-500">
            {existingUsers.length > 0 
              ? 'Welcome back! Please sign in to continue.'
              : 'Welcome! Create your account to get started.'}
          </p>
        </ModalHeader>
        
        <ModalBody className="gap-4">
          {/* Show existing users if any */}
          {existingUsers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">Existing Users</h3>
                <Chip size="sm" variant="flat" color="default">
                  {existingUsers.length}
                </Chip>
              </div>
              <div className="flex flex-wrap gap-2">
                {existingUsers.map((user) => (
                  <Card 
                    key={user.id} 
                    isPressable 
                    onPress={() => handleUserClick(user)}
                    className="min-w-fit hover:bg-default-100"
                  >
                    <CardBody className="p-3">
                      <div className="flex items-center gap-2">
                        <Avatar 
                          size="sm" 
                          name={user.username} 
                          classNames={{
                            name: "text-xs"
                          }}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{user.username}</p>
                          <p className="text-xs text-default-400">
                            Last login: {user.lastLogin.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
              <Divider />
            </div>
          )}
          
          {/* Login/Register Form */}
          <div className="space-y-4">
            <Tabs 
              selectedKey={activeTab} 
              onSelectionChange={(key) => setActiveTab(key as 'login' | 'register')}
              classNames={{
                tabList: "w-full",
                tab: "w-full"
              }}
            >
              <Tab key="login" title="Sign In" />
              <Tab key="register" title="Create Account" />
            </Tabs>
            
            <div className="space-y-4">
              <Input
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                variant="bordered"
                autoFocus
                onKeyPress={handleKeyPress}
                isDisabled={isSubmitting}
              />
              
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                variant="bordered"
                onKeyPress={handleKeyPress}
                isDisabled={isSubmitting}
              />
              
              {activeTab === 'register' && (
                <Input
                  label="Confirm Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  variant="bordered"
                  color={password !== confirmPassword ? 'danger' : 'default'}
                  onKeyPress={handleKeyPress}
                  isDisabled={isSubmitting}
                />
              )}
              
              {error && (
                <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
                  <p className="text-danger-700 text-sm">{error}</p>
                </div>
              )}
            </div>
            
            {activeTab === 'register' && (
              <Card className="bg-primary-50 border-primary-200">
                <CardBody className="p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-primary-600">💡</span>
                    <div className="flex-1">
                      <p className="text-primary-800 text-sm">
                        <strong>Remember:</strong> Your username and password will be used to encrypt 
                        your API keys and settings. Make sure to remember them as they cannot be recovered.
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}
            
            {activeTab === 'login' && (
              <Card className="bg-success-50 border-success-200">
                <CardBody className="p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-success-600">🔓</span>
                    <div className="flex-1">
                      <p className="text-success-700 text-sm">
                        Your password will be remembered for 1 hour after successful login, 
                        automatically unlocking your settings during this period.
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        </ModalBody>
        
        <ModalFooter>
          <Button 
            color="primary" 
            onPress={handleSubmit}
            isLoading={isSubmitting}
            isDisabled={!username.trim() || !password.trim() || (activeTab === 'register' && !confirmPassword.trim())}
            className="w-full"
          >
            {activeTab === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}; 