-- 为代理添加联系方式
UPDATE agents SET 
  contact_phone = '+1-555-' || substr('0000' || (id * 123), -4, 4),
  contact_email = agent_username || '@example.com'
WHERE id >= 2;
