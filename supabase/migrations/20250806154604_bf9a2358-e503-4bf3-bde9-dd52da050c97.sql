-- Clean up duplicate roles by removing 'admin' role for users who have both 'admin' and 'super_admin'
-- Keep 'super_admin' as it's the higher privilege role

DELETE FROM user_roles 
WHERE role = 'admin' 
AND user_id IN (
  SELECT user_id 
  FROM user_roles 
  WHERE role = 'super_admin'
);

-- Add a unique constraint to prevent future duplicate role assignments
ALTER TABLE user_roles ADD CONSTRAINT unique_user_role UNIQUE (user_id, role);