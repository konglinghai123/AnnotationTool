package annotation.AutomaticAnno.src.annotate;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;

import dict.DictTree.Node;

public class AnnotateByKmeans {
	Node tree = new Node(null, null);
	public AnnotateByKmeans(String filename) throws Exception {
		tree = new KmeansTreeHelper(filename).tree;
	}
	private String annotateStringHelper(String line, StringBuffer sb) {
		int i=0;
		Node temp = tree;
		int word_i = -1;
		String word_type = null;
		String ch = line.substring(i, i+1);
		try{
			while(temp.children!=null && temp.children.containsKey(ch) && i<line.length()-1) {
				temp = temp.children.get(ch);
				if(temp.is_word) {
					word_i = i;
					int ii = temp.type.indexOf("-");
					if(ii>-1) 
						word_type = temp.type.substring(0, ii);
					else
						word_type = temp.type;
				}
				i++;
				ch = line.substring(i, i+1);
			}
			
			if(word_i==-1) {
				sb.append(line.charAt(0));
				word_i = 0;
			} else {
				sb.append(" ");
				sb.append(line.substring(0, word_i+1));
				sb.append("\\"+word_type+" ");
			}
			
			if(line.length()>1)
				annotateStringHelper(line.substring(word_i+1), sb);
		} catch (Exception e ) {
			System.out.println(line);
			System.out.println(sb.toString());
			System.out.println(i);
			System.out.println(word_i);
			System.out.println(line.length());
			e.printStackTrace();
			System.exit(0);
		}
		return sb.toString();
	}
	
	public String annotateString(String line) {
		return annotateStringHelper(line, new StringBuffer()).replaceAll("[ ]+", " ").replaceAll("^ ", "").replaceAll(" $", "");
	}
	public void annotateFile(String input, String output, String encode) throws IOException {
		BufferedReader br = new BufferedReader(new InputStreamReader(new FileInputStream(input), "utf8"));
		String line  =null;
		BufferedWriter bw = new BufferedWriter( new OutputStreamWriter(new FileOutputStream(output), "utf8"));
		while( (line=br.readLine()) != null ) {
			if(line.length()==0) {
				bw.newLine();
				continue;
			}
			try{
				String temp = annotateString(line);
				bw.write(temp);
				bw.newLine();
			}catch (StackOverflowError e) {
				e.printStackTrace();
			}
		}
		bw.close();
		br.close();
	}
	public static void main(String[] args) throws IOException, Exception {
		// TODO Auto-generated method stub
		String file = "D:\\eclipse_workspace\\crf_HealthQA\\res\\testKmeans\\train_lkx.orig";
		new AnnotateByKmeans("100").annotateFile(file, "D:\\eclipse_workspace\\crf_HealthQA\\res\\testKmeans\\train_lkx.kmeans", "utf8");
	}

}
