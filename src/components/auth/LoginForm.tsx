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
  Chip,
  Tooltip
} from '@heroui/react';
import { User, deleteUser } from '../../lib/user-management';

interface LoginFormProps {
  isOpen: boolean;
  onLogin: (username: string, password: string) => Promise<boolean>;
  onRegister: (username: string, password: string) => Promise<boolean>;
  onDeleteUser?: (user: User) => void;
  existingUsers: User[];
  isLoading?: boolean;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  isOpen,
  onLogin,
  onRegister,
  onDeleteUser,
  existingUsers,
  isLoading = false
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    user: User | null;
  }>({ isOpen: false, user: null });

  // Set default tab based on existing users
  useEffect(() => {
    if (existingUsers.length > 0) {
      setActiveTab('login');
    } else {
      setActiveTab('register');
    }
  }, [existingUsers.length]);

  // Reset form when tab changes
  useEffect(() => {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setError('');
  }, [activeTab]);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    setError('');
    setIsSubmitting(true);
    
    try {
      if (activeTab === 'register') {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        if (password.length < 8) {
          setError('Password must be at least 8 characters long');
          return;
        }
        const success = await onRegister(username, password);
        if (!success) {
          setError('Registration failed. Username may already exist.');
        }
      } else {
        const success = await onLogin(username, password);
        if (!success) {
          setError('Invalid username or password');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUserClick = (user: User) => {
    setUsername(user.username);
    setActiveTab('login');
  };

  const handleDeleteUser = (user: User) => {
    setDeleteConfirmation({ isOpen: true, user });
  };

  const confirmDeleteUser = () => {
    if (deleteConfirmation.user) {
      try {
        deleteUser(deleteConfirmation.user);
        onDeleteUser?.(deleteConfirmation.user);
        setDeleteConfirmation({ isOpen: false, user: null });
      } catch (error) {
        console.error('Failed to delete user:', error);
        setError('Failed to delete user. Please try again.');
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={() => {}} 
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
                    <div key={user.id} className="relative">
                      <Card 
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
                      <Tooltip content="Delete user and all data" placement="top">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="solid"
                          onPress={() => handleDeleteUser(user)}
                          className="absolute -top-2 -right-2 z-20 min-w-6 w-6 h-6 bg-black hover:bg-gray-800 text-white rounded-full shadow-md"
                        >
                          ×
                        </Button>
                      </Tooltip>
                    </div>
                  ))}
                </div>
                <Divider />
              </div>
            )}
            
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

      <Modal 
        isOpen={deleteConfirmation.isOpen} 
        onClose={() => setDeleteConfirmation({ isOpen: false, user: null })}
        size="sm"
        backdrop="blur"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <h3 className="text-lg font-bold text-danger">Delete User</h3>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-3">
              <p className="text-sm">
                Are you sure you want to delete <strong>{deleteConfirmation.user?.username}</strong>?
              </p>
              <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
                <p className="text-danger-700 text-sm">
                  <strong>⚠️ Warning:</strong> This will permanently delete:
                </p>
                <ul className="text-danger-600 text-xs mt-2 ml-4 list-disc">
                  <li>User account and login credentials</li>
                  <li>All encrypted settings and API keys</li>
                  <li>All conversation history</li>
                  <li>All calendar events</li>
                </ul>
                <p className="text-danger-700 text-xs mt-2">
                  <strong>This action cannot be undone.</strong>
                </p>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button 
              variant="light" 
              onPress={() => setDeleteConfirmation({ isOpen: false, user: null })}
            >
              Cancel
            </Button>
            <Button 
              color="danger" 
              onPress={confirmDeleteUser}
            >
              Delete User
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}; 